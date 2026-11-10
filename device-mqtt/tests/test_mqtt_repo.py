"""CPython regression tests for mqtt_repo.py; no broker or MicroPython needed."""
import asyncio
import importlib.util
import pathlib
import sys
import types
from unittest.mock import Mock

import pytest

SOURCE = pathlib.Path(__file__, '../../lib/mqtt_repo.py').resolve(True)


class Setting:
    def __init__(self, value):
        self.value = value

    def get(self):
        return self.value

    def set(self, value):
        self.value = value


class Config:
    def create(self, name, default):
        return Setting({'mqtt_server': '127.0.0.1', 'mqtt_client_id': 'test-device'}.get(name, default))


@pytest.fixture
def environment(monkeypatch):
    # mqtt_repo.py imports MicroPython-specific modules at module load time.
    monkeypatch.setitem(sys.modules, 'typ', __import__('typing'))
    monkeypatch.setitem(sys.modules, 'machine', types.SimpleNamespace(unique_id=lambda: b'\x01\x02'))
    monkeypatch.setitem(sys.modules, 'util', types.SimpleNamespace(is_ip=lambda x: True))
    logger = types.SimpleNamespace(info=Mock(), error=Mock())
    monkeypatch.setitem(sys.modules, 'log', logger)
    monkeypatch.setitem(sys.modules, 'config', types.SimpleNamespace(Config=Config))
    monkeypatch.setitem(sys.modules, 'wlan', types.SimpleNamespace(Wlan=object))
    clients = []

    class FakeClient:
        def __init__(self, *args, **kwargs):
            self.publish = Mock()
            self.connect = Mock()
            self.disconnect = Mock()
            self.check_msg = Mock()
            self.subscribe = Mock()
            self.set_callback = Mock()
            self.set_last_will = Mock()
            clients.append(self)

    monkeypatch.setitem(sys.modules, 'umqttsimple', types.SimpleNamespace(MQTTClient=FakeClient))
    spec = importlib.util.spec_from_file_location('mqtt_repo_under_test', SOURCE)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    wifi = types.SimpleNamespace(wlan=types.SimpleNamespace(isconnected=lambda: True))
    repo = module.MQTTRepo(Config(), wifi, asyncio.new_event_loop(),
                           interval_mqtt_check=0, interval_mqtt_reconnect=0)
    yield repo, clients, logger, module
    repo._loop.close()


def attach_client(environment):
    repo, clients, _, module = environment
    client = module.MQTTClient()
    repo._client = client
    return client


def test_successful_publish(environment):
    repo, _, _, _ = environment
    client = attach_client(environment)
    assert repo.put('sensor/temp', '22') is True
    client.publish.assert_called_once_with('sensor/temp', '22', True)
    assert repo._pending is None
    assert repo._lazy == {'sensor/temp': '22'}


def test_failed_publish_disconnects_and_queues_message(environment):
    repo, _, logger, _ = environment
    client = attach_client(environment)
    client.publish.side_effect = OSError('ECONNRESET')
    assert repo.put('sensor/temp', '22') is False
    assert repo._client is None
    client.disconnect.assert_called_once()
    assert repo._pending == {'sensor/temp': ('22', True)}
    assert repo._lazy == {}
    logger.error.assert_called_once()


def test_disconnected_put_buffers_without_publishing(environment):
    repo, _, _, _ = environment
    assert repo.put('sensor/temp', '22') is False
    assert repo._pending == {'sensor/temp': ('22', True)}


def test_latest_value_wins_for_same_topic(environment):
    repo, _, _, _ = environment
    repo.put('sensor/temp', '21')
    repo.put('sensor/temp', '22')
    repo.put('sensor/humidity', '50', lazy=False)
    assert repo._pending == {
        'sensor/temp': ('22', True),
        'sensor/humidity': ('50', False),
    }


def test_duplicate_lazy_publish_skipped_after_success(environment):
    repo, _, _, _ = environment
    client = attach_client(environment)
    assert repo.put('sensor/temp', '22') is True
    assert repo.put('sensor/temp', '22') is True
    assert client.publish.call_count == 1
    assert repo.put('sensor/temp', '22', lazy=False) is True
    assert client.publish.call_count == 2


def test_failure_clears_lazy_cache_so_same_value_can_retry(environment):
    repo, _, _, _ = environment
    client = attach_client(environment)
    repo.put('sensor/temp', '22')
    client.publish.side_effect = OSError('broken pipe')
    assert repo.put('sensor/humidity', '50') is False
    assert repo._lazy == {}
    new_client = attach_client(environment)
    assert repo.put('sensor/temp', '22') is False  # pending exists; enqueue
    assert repo._pending['sensor/temp'] == ('22', True)
    new_client.publish.assert_not_called()


def test_pending_message_can_be_retried_after_reconnect(environment):
    repo, _, _, _ = environment
    failed = attach_client(environment)
    failed.publish.side_effect = OSError('ECONNRESET')
    assert repo.put('sensor/temp', '22') is False
    healthy = attach_client(environment)
    topic, (message, lazy) = repo._pending.popitem()
    assert repo._publish(topic, message, lazy, do_pending=False) is True
    healthy.publish.assert_called_once_with('sensor/temp', '22', True)
    assert repo._lazy['sensor/temp'] == '22'


def test_failed_retry_is_requeued(environment):
    repo, _, _, _ = environment
    repo.put('sensor/temp', '22')
    client = attach_client(environment)
    client.publish.side_effect = OSError('ECONNRESET')
    topic, (message, lazy) = repo._pending.popitem()
    assert repo._publish(topic, message, lazy, do_pending=False) is False
    assert repo._pending == {'sensor/temp': ('22', True)}
    assert repo._client is None


def test_publish_exception_other_than_oserror_is_handled(environment):
    repo, _, _, _ = environment
    client = attach_client(environment)
    client.publish.side_effect = RuntimeError('unexpected')
    assert repo.put('sensor/temp', '22') is False
    assert repo._pending['sensor/temp'] == ('22', True)


def test_pending_queue_drains_in_run_loop_after_reconnect(environment, monkeypatch):
    repo, clients, _, module = environment
    repo.put('sensor/temp', '22')
    # Stop the infinite worker deterministically after enough iterations.
    ticks = 0
    async def bounded_sleep(_):
        nonlocal ticks
        ticks += 1
        if ticks >= 17:
            raise asyncio.CancelledError()
    monkeypatch.setattr(module.asyncio, 'sleep', bounded_sleep)
    with pytest.raises(asyncio.CancelledError):
        asyncio.run(repo._run())
    assert clients[0].connect.call_count == 1
    assert ('sensor/temp', '22', True) in [c.args for c in clients[0].publish.call_args_list]
    assert repo._pending in (None, {})


def test_run_loop_retries_after_failed_publish(environment, monkeypatch):
    repo, clients, _, module = environment
    repo.put('sensor/temp', '22')
    original_client = module.MQTTClient

    class FailingFirstClient(original_client):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, **kwargs)
            if len(clients) == 1:
                # First publish is the online status; second is queued sensor data.
                def fail_sensor(topic, msg, retain):
                    if topic == 'sensor/temp':
                        raise OSError('ECONNRESET')
                self.publish.side_effect = fail_sensor

    monkeypatch.setattr(module, 'MQTTClient', FailingFirstClient)
    ticks = 0
    async def bounded_sleep(_):
        nonlocal ticks
        ticks += 1
        if ticks >= 40:
            raise asyncio.CancelledError()
    monkeypatch.setattr(module.asyncio, 'sleep', bounded_sleep)
    with pytest.raises(asyncio.CancelledError):
        asyncio.run(repo._run())
    assert len(clients) >= 2
    assert any(c.args[:2] == ('sensor/temp', '22') for c in clients[1].publish.call_args_list)
    assert repo._pending in (None, {})
