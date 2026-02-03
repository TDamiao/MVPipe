import { createContext } from 'react';
import { ConnectionDetails, DashboardData } from './types';

interface AppContextType {
    connections: ConnectionDetails[];
    addConnection: (details: ConnectionDetails) => void;
    removeConnection: (id: string) => void;
    activeTab: string | null;
    setActiveTab: (id: string | null) => void;
    
    // A map to store data for each connection
    dashboardData: Map<string, DashboardData>;
    updateDashboardData: (connectionId: string, data: DashboardData) => void;
}

export const AppContext = createContext<AppContextType | null>(null);
