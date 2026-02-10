import { useState, useContext } from 'react';
import { AppContext } from './AppContext';
import {
    AppBar,
    Tabs,
    Tab,
    Box,
    Button,
    Container,
    Typography,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import CloseIcon from '@mui/icons-material/Close';
import NewConnectionModal from './components/NewConnectionModal';
import Dashboard from './components/Dashboard';
import { AppProvider } from './AppProvider';

function a11yProps(index: string) {
    return {
        id: `simple-tab-${index}`,
        'aria-controls': `simple-tabpanel-${index}`,
    };
}

const AppContent = () => {
    const context = useContext(AppContext);
    const [modalOpen, setModalOpen] = useState(false);

    if (!context) return null; // Should not happen within AppProvider

    const { connections, activeTab, setActiveTab } = context;

    const handleChange = (_event: React.SyntheticEvent, newValue: string) => {
        setActiveTab(newValue);
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <AppBar position="static">
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Tabs
                        value={activeTab || false}
                        onChange={handleChange}
                        aria-label="database connections"
                        sx={{ flexGrow: 1 }}
                    >
                        {connections.map((conn) => (
                            <Tab
                                key={conn.id}
                                label={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography variant="body2" noWrap sx={{ maxWidth: 140 }}>
                                            {conn.name}
                                        </Typography>
                                        <Box
                                            component="span"
                                            onMouseDown={(e) => e.stopPropagation()}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                context.removeConnection(conn.id);
                                            }}
                                            sx={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: 20,
                                                height: 20,
                                                borderRadius: '50%',
                                                '&:hover': { bgcolor: 'action.hover' },
                                            }}
                                            aria-label={`Close ${conn.name}`}
                                        >
                                            <CloseIcon fontSize="small" />
                                        </Box>
                                    </Box>
                                }
                                value={conn.id}
                                {...a11yProps(conn.id)}
                            />
                        ))}
                    </Tabs>
                    <Button
                        variant="contained"
                        color="secondary"
                        startIcon={<AddCircleOutlineIcon />}
                        onClick={() => setModalOpen(true)}
                        sx={{ margin: '8px 16px', flexShrink: 0 }}
                    >
                        New Connection
                    </Button>
                </Box>
            </AppBar>
            
            <NewConnectionModal open={modalOpen} handleClose={() => setModalOpen(false)} />

            <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
                {connections.length === 0 && (
                     <Container sx={{ textAlign: 'center', paddingTop: '20vh' }}>
                        <Typography variant="h4" gutterBottom>Welcome to MV PIPE</Typography>
                        <Typography variant="subtitle1" color="text.secondary">
                            Click on "New Connection" to start monitoring an Oracle database.
                        </Typography>
                     </Container>
                )}
                {connections.map((conn) => (
                    <div
                        role="tabpanel"
                        hidden={activeTab !== conn.id}
                        id={`simple-tabpanel-${conn.id}`}
                        aria-labelledby={`simple-tab-${conn.id}`}
                        key={conn.id}
                        style={{ height: '100%' }}
                    >
                        {activeTab === conn.id && (
                            <Box sx={{ p: 3, height: '100%' }}>
                                <Dashboard connectionId={conn.id} />
                            </Box>
                        )}
                    </div>
                ))}
            </Box>
        </Box>
    );
}

const App = () => (
    <AppProvider>
        <AppContent />
    </AppProvider>
);

export default App;
