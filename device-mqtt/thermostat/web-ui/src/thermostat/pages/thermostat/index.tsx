import React, { useState } from 'react';
import { useGetData } from '@/lib';
import { SpinnerBars } from '@/components/ui/shadcn-io/spinner';
import * as tep from '@/thermostat/lib';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Temperatures from './temperatures';
import Configurations from './configurations';

/* ========================================================================== */

const ThermostatScheduler: React.FC = () => {
  const [isProcessing, setProcessing] = useState<boolean>(false);
  const [get, refresh] = useGetData<tep.ThermostatConfig>(tep.PATH_THERMOSTAT_CONFIG, 'refresh');

  return (
    <>
      <Tabs defaultValue="temperatures">
        <TabsList>
          <TabsTrigger value="temperatures">Temperatures</TabsTrigger>
          <TabsTrigger value="configurations">Configurations</TabsTrigger>
        </TabsList>
        <TabsContent value="temperatures">
          <Temperatures get={get} refresh={refresh} setProcessing={setProcessing} />
        </TabsContent>
        <TabsContent value="configurations">
          <Configurations get={get} refresh={refresh} setProcessing={setProcessing}/>
        </TabsContent>
      </Tabs>
      {isProcessing && (
        <div className="fixed flex justify-center items-center inset-0 z-50 bg-black/30">
          <SpinnerBars className="text-blue-500" size={64} />
        </div>
      )}
    </>
  );
};

export default ThermostatScheduler;