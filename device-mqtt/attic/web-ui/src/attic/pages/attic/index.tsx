import React, { useState } from 'react';
import { useGetData } from '@/lib';
import { SpinnerBars } from '@/components/ui/shadcn-io/spinner';
import * as aep from '@/attic/lib';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Schedule from './schedule';
import Configurations from './configurations';

/* ========================================================================== */

const Attic: React.FC = () => {
  const [isProcessing, setProcessing] = useState<boolean>(false);
  const [get, refresh] = useGetData<aep.AtticConfig>(aep.PATH_ATTIC_CONFIG, 'refresh');

  return (
    <>
      <Tabs defaultValue="temperatures">
        <TabsList>
          <TabsTrigger value="temperatures">Schedule</TabsTrigger>
          <TabsTrigger value="configurations">Configurations</TabsTrigger>
        </TabsList>
        <TabsContent value="temperatures">
          <Schedule get={get} refresh={refresh} setProcessing={setProcessing} />
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

export default Attic;