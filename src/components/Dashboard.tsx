import { useState, useEffect, useContext, useMemo, useCallback, useRef } from 'react';
import { AppContext } from '../AppContext';
import { ActiveLoad, DashboardData, FilterOptions } from '../types';
import {
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    Paper,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TableSortLabel,
    Tooltip,
    IconButton,
    Alert,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import StorageIcon from '@mui/icons-material/Storage';
import LockIcon from '@mui/icons-material/Lock';
import { visuallyHidden } from '@mui/utils';

interface Props {
    connectionId: string;
}

type Order = 'asc' | 'desc';
type SortableKeys = keyof ActiveLoad;

const Dashboard = ({ connectionId }: Props) => {
    const context = useContext(AppContext);
    const data = context?.dashboardData.get(connectionId);

    const [error, setError] = useState<string | null>(null);
    const [isPaused, setIsPaused] = useState(false);
    const [refreshInterval, setRefreshInterval] = useState(5000);

    const [filters, setFilters] = useState<FilterOptions>({
        owner: '',
        minDuration: 0,
    });

    const [order, setOrder] = useState<Order>('desc');
    const [orderBy, setOrderBy] = useState<SortableKeys>('durationSec');

    const isFetchingRef = useRef(false);

    const fetchData = useCallback(async () => {
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;
        setError(null);
        try {
            const result = await window.api.fetchData(connectionId);
            if (result.error) {
                setError(result.error);
                setIsPaused(true); // Pause on error
            } else {
                context?.updateDashboardData(connectionId, result as DashboardData);
            }
        } catch (err: any) {
            setError(err.message);
            setIsPaused(true); // Pause on error
        } finally {
            isFetchingRef.current = false;
        }
    }, [connectionId, context]);

    useEffect(() => {
        let intervalId: NodeJS.Timeout;
        if (!isPaused) {
            fetchData(); // Initial fetch (only when active)
            intervalId = setInterval(fetchData, refreshInterval);
        }

        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [isPaused, refreshInterval, fetchData]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name as string]: value }));
    };
    
    const handleDisconnect = () => {
        context?.removeConnection(connectionId);
    };

    const filteredData = useMemo(() => {
        if (!data) return [];
        return data.activeLoads.filter(load => {
            return (
                (filters.owner === '' || load.owner?.toLowerCase().includes(filters.owner.toLowerCase())) &&
                (filters.minDuration === 0 || load.durationSec >= filters.minDuration)
            );
        });
    }, [data, filters]);

    const handleSortRequest = (property: SortableKeys) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const sortedData = useMemo(() => {
        const comparator = (a: ActiveLoad, b: ActiveLoad) => {
            const av = a[orderBy];
            const bv = b[orderBy];
            if (av == null && bv == null) return 0;
            if (av == null) return order === 'asc' ? -1 : 1;
            if (bv == null) return order === 'asc' ? 1 : -1;
            if (bv < av) return order === 'asc' ? 1 : -1;
            if (bv > av) return order === 'asc' ? -1 : 1;
            return 0;
        };
        return [...filteredData].sort(comparator);
    }, [filteredData, order, orderBy]);

    return (
        <Box sx={{ height: 'calc(100vh - 128px)', display: 'flex', flexDirection: 'column' }}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {/* Toolbar */}
            <Paper sx={{ p: 2, mb: 2 }}>
                <Grid container spacing={2} alignItems="center">
                    {/* Filters */}
                    <Grid item><TextField label="Owner" name="owner" size="small" onChange={handleFilterChange} /></Grid>
                    <Grid item><TextField label="Min Duration (s)" name="minDuration" type="number" size="small" onChange={handleFilterChange} /></Grid>

                    <Grid item sx={{ flexGrow: 1 }} />

                    {/* Controls */}
                    <Grid item>
                        <FormControl size="small">
                            <InputLabel>Refresh</InputLabel>
                            <Select value={refreshInterval} label="Refresh" onChange={e => setRefreshInterval(e.target.value as number)}>
                                <MenuItem value={5000}>5s</MenuItem>
                                <MenuItem value={10000}>10s</MenuItem>
                                <MenuItem value={30000}>30s</MenuItem>
                                <MenuItem value={60000}>60s</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item>
                        <Tooltip title={isPaused ? "Resume Polling" : "Pause Polling"}>
                            <IconButton onClick={() => setIsPaused(!isPaused)}>
                                {isPaused ? <PlayArrowIcon /> : <PauseIcon />}
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Disconnect">
                            <IconButton color="error" onClick={handleDisconnect}>
                                <LinkOffIcon />
                            </IconButton>
                        </Tooltip>
                    </Grid>
                </Grid>
            </Paper>

            {/* Summary Cards */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
                <SummaryCard icon={<QueryStatsIcon />} title="Active Load Sessions" value={data?.summary.activeSessions ?? '...'} />
                <SummaryCard
                    icon={<StorageIcon />}
                    title="Total Estimated Volume"
                    value={data?.summary ? `${data.summary.totalEstMB.toFixed(2)} MB` : '...'}
                />
                <SummaryCard icon={<LockIcon />} title="Blocking Locks Detected" value={data?.summary.detectedLocks ?? '...'} />
                <SummaryCard
                    icon={<QueryStatsIcon />}
                    title="DB CPU Usage"
                    value={data?.summary.dbCpuPercent !== undefined ? `${data.summary.dbCpuPercent.toFixed(1)}%` : '...'}
                    valueColor={
                        data?.summary.dbCpuPercent !== undefined
                            ? data.summary.dbCpuPercent >= 90
                                ? 'error.main'
                                : data.summary.dbCpuPercent >= 70
                                    ? 'warning.main'
                                    : 'text.primary'
                            : undefined
                    }
                />
            </Grid>
            
            {/* Main Table */}
            <TableContainer component={Paper} sx={{ flexGrow: 1, overflowY: 'auto' }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            {tableHeaders.map(headCell => (
                                <TableCell key={headCell.id} sortDirection={orderBy === headCell.id ? order : false}>
                                    <TableSortLabel
                                        active={orderBy === headCell.id}
                                        direction={orderBy === headCell.id ? order : 'asc'}
                                        onClick={() => handleSortRequest(headCell.id as SortableKeys)}
                                    >
                                        {headCell.label}
                                        {orderBy === headCell.id ? (
                                            <Box component="span" sx={visuallyHidden}>
                                                {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                                            </Box>
                                        ) : null}
                                    </TableSortLabel>
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {sortedData.map(row => (
                             <TableRow hover key={row.sid}>
                                <TableCell>{row.sid}</TableCell>
                                <TableCell>{row.owner}</TableCell>
                                <TableCell>{row.machine || '-'}</TableCell>
                                <TableCell>{row.osuser || '-'}</TableCell>
                                <TableCell align="right">{row.cpuPercent !== undefined ? row.cpuPercent.toFixed(2) : '-'}</TableCell>
                                <TableCell align="right">{row.durationSec}</TableCell>
                                <TableCell align="right">{row.estMB.toFixed(2)}</TableCell>
                                <TableCell>{row.impact}</TableCell>
                                <TableCell sx={{ maxWidth: 260, width: 260 }}>
                                    <Tooltip title={row.sqlText} placement="top">
                                        <Typography
                                            variant="body2"
                                            noWrap
                                            sx={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis' }}
                                        >
                                            {row.waitEvent}
                                        </Typography>
                                    </Tooltip>
                                </TableCell>
                             </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

interface SummaryCardProps {
    icon: React.ReactNode;
    title: string;
    value: string | number;
    valueColor?: string;
}
const SummaryCard = ({ icon, title, value, valueColor }: SummaryCardProps) => (
    <Grid item xs={12} sm={6} md={3}>
        <Card>
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    {icon}
                    <Typography variant="h6" sx={{ ml: 1 }}>{title}</Typography>
                </Box>
                <Typography variant="h4" align="center" sx={valueColor ? { color: valueColor } : undefined}>
                    {value}
                </Typography>
            </CardContent>
        </Card>
    </Grid>
);

const tableHeaders = [
    { id: 'sid', label: 'SID' },
    { id: 'owner', label: 'Owner' },
    { id: 'machine', label: 'Host' },
    { id: 'osuser', label: 'OS User' },
    { id: 'cpuPercent', label: 'CPU %' },
    { id: 'durationSec', label: 'Duration (s)' },
    { id: 'estMB', label: 'Est. MB' },
    { id: 'impact', label: 'Impact' },
    { id: 'waitEvent', label: 'Wait/Event' },
];


export default Dashboard;
