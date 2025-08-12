import React from 'react';

/* ========================================================================== */

export interface DashboardProps {
    dashboardItems: DashboardItem[];
}

export interface DashboardItem {
    node: React.ReactNode;
}

/* ========================================================================== */

const Dashboard: React.FC<DashboardProps> = ({ dashboardItems }) => {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {dashboardItems.map((entry) => entry.node )}
            </div>
        </div>
    );
};

export default Dashboard;