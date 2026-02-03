import React, { useState, useCallback, ReactNode } from 'react';
import { AppContext } from './AppContext';
import { ConnectionDetails, DashboardData } from './types';

interface AppProviderProps {
    children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
    const [connections, setConnections] = useState<ConnectionDetails[]>([]);
    const [activeTab, setActiveTab] = useState<string | null>(null);
    const [dashboardData, setDashboardData] = useState<Map<string, DashboardData>>(new Map());

    const addConnection = useCallback((details: ConnectionDetails) => {
        setConnections(prev => [...prev, details]);
        setActiveTab(details.id);
    }, []);

    const removeConnection = useCallback(async (id: string) => {
        // Use the API to disconnect from the backend
        await window.api.disconnect(id);
        
        setConnections(prev => prev.filter(c => c.id !== id));
        setDashboardData(prev => {
            const newMap = new Map(prev);
            newMap.delete(id);
            return newMap;
        });

        // If the closed tab was the active one, switch to another tab
        if (activeTab === id) {
            const remainingConnections = connections.filter(c => c.id !== id);
            setActiveTab(remainingConnections.length > 0 ? remainingConnections[0].id : null);
        }
    }, [activeTab, connections]);

    const updateDashboardData = useCallback((connectionId: string, data: DashboardData) => {
        setDashboardData(prev => new Map(prev).set(connectionId, data));
    }, []);

    return (
        <AppContext.Provider value={{ connections, addConnection, removeConnection, activeTab, setActiveTab, dashboardData, updateDashboardData }}>
            {children}
        </AppContext.Provider>
    );
};
