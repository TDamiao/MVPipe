import { useState, useContext, useEffect } from 'react';
import {
    Modal,
    Box,
    Typography,
    TextField,
    Button,
    Grid,
    Alert,
} from '@mui/material';
import { AppContext } from '../AppContext';
import { ConnectionDetails } from '../types';

const style = {
    position: 'absolute' as 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 600,
    bgcolor: 'background.paper',
    border: '2px solid #000',
    boxShadow: 24,
    p: 4,
};

interface Props {
    open: boolean;
    handleClose: () => void;
}

const NewConnectionModal = ({ open, handleClose }: Props) => {
    const context = useContext(AppContext);
    const [details, setDetails] = useState<Partial<ConnectionDetails>>({
        name: 'Local Dev',
        host: 'localhost',
        port: 1521,
        serviceName: 'XEPDB1',
        user: 'system',
        owner: ''
    });
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Reset form when modal opens/closes
        setError(null);
        setLoading(false);
    }, [open]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDetails({ ...details, [e.target.name]: e.target.value });
    };

    const handleConnect = async () => {
        if (!context) return;
        setLoading(true);
        setError(null);

        const connectionId = `conn_${Date.now()}`;
        const newConnection: ConnectionDetails = {
            id: connectionId,
            name: details.name || 'Untitled',
            ...details
        };

        const result = await window.api.connect(newConnection);
        
        if (result.error) {
            setError(result.error);
        } else {
            context.addConnection({ ...newConnection, id: result.connectionId });
            handleClose();
        }
        setLoading(false);
    };

    return (
        <Modal open={open} onClose={handleClose}>
            <Box sx={style}>
                <Typography variant="h6" component="h2" gutterBottom>
                    New Oracle Connection
                </Typography>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Connection Name"
                            name="name"
                            value={details.name}
                            onChange={handleChange}
                            variant="outlined"
                        />
                    </Grid>
                    <Grid item xs={8}>
                        <TextField
                            fullWidth
                            label="Host"
                            name="host"
                            value={details.host}
                            onChange={handleChange}
                            variant="outlined"
                        />
                    </Grid>
                    <Grid item xs={4}>
                        <TextField
                            fullWidth
                            label="Port"
                            name="port"
                            type="number"
                            value={details.port}
                            onChange={handleChange}
                            variant="outlined"
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Service Name"
                            name="serviceName"
                            value={details.serviceName}
                            onChange={handleChange}
                            variant="outlined"
                        />
                    </Grid>
                    <Grid item xs={6}>
                        <TextField
                            fullWidth
                            label="User"
                            name="user"
                            value={details.user}
                            onChange={handleChange}
                            variant="outlined"
                        />
                    </Grid>
                    <Grid item xs={6}>
                        <TextField
                            fullWidth
                            label="Password"
                            name="password"
                            type="password"
                            onChange={handleChange}
                            variant="outlined"
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Owner (Optional Filter)"
                            name="owner"
                            value={details.owner}
                            onChange={handleChange}
                            variant="outlined"
                            helperText="Filter results by a specific schema/owner."
                        />
                    </Grid>
                </Grid>
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button onClick={handleClose} sx={{ mr: 1 }}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleConnect}
                        disabled={loading}
                    >
                        {loading ? 'Connecting...' : 'Connect & Monitor'}
                    </Button>
                </Box>
            </Box>
        </Modal>
    );
};

export default NewConnectionModal;
