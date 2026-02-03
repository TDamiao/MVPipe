import { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { AppContext } from '../AppContext';
import { ActiveLoad, DashboardData, FilterOptions } from '../types';
import {
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    Paper,
    Toolbar,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TableSortLabel,
    Tooltip,
    IconButton,
    CircularProgress,
    Alert,
    SelectChangeEvent,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import RefreshIcon from '@mui/icons-material/Refresh';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import StorageIcon from '@mui/icons-material/Storage';
import LockIcon from '@mui/icons-material/Lock';
import TableChartIcon from '@mui/icons-material/TableChart';
import { visuallyHidden } from '@mui/utils';

interface Props {
    connectionId: string;
}

type Order = 'asc' | 'desc';
type SortableKeys = keyof ActiveLoad;

const Dashboard = ({ connectionId }: Props) => {
    const context = useContext(AppContext);
    const data = context?.dashboardData.get(connectionId);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPaused, setIsPaused] = useState(false);
    const [refreshInterval, setRefreshInterval] = useState(5000);

    const [filters, setFilters] = useState<FilterOptions>({
        owner: '',
        operation: '',
        minDuration: 0,
        impact: '',
        table: '',
    });

    const [order, setOrder] = useState<Order>('desc');
    const [orderBy, setOrderBy] = useState<SortableKeys>('durationSec');

    const fetchData = useCallback(async () => {
        if (loading) return;
        setLoading(true);
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
            setLoading(false);
        }
    }, [connectionId, context, loading]);

    useEffect(() => {
        fetchData(); // Initial fetch

        let intervalId: NodeJS.Timeout;
        if (!isPaused) {
            intervalId = setInterval(fetchData, refreshInterval);
        }

        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [isPaused, refreshInterval, fetchData]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }> | SelectChangeEvent<string>) => {
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
                (filters.operation === '' || load.operation === filters.operation) &&
                (filters.minDuration === 0 || load.durationSec >= filters.minDuration) &&
                (filters.impact === '' || load.impact === filters.impact) &&
                (filters.table === '' || load.mainTable.toLowerCase().includes(filters.table.toLowerCase()))
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
            if (b[orderBy] < a[orderBy]) return order === 'asc' ? 1 : -1;
            if (b[orderBy] > a[orderBy]) return order === 'asc' ? -1 : 1;
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
                    <Grid item><TextField label="Table Contains" name="table" size="small" onChange={handleFilterChange} /></Grid>
                    <Grid item>
                        <FormControl size="small" sx={{minWidth: 120}}>
                            <InputLabel>Operation</InputLabel>
                            <Select name="operation" label="Operation" value={filters.operation} onChange={handleFilterChange}>
                                <MenuItem value="">All</MenuItem>
                                <MenuItem value="SELECT">SELECT</MenuItem>
                                <MenuItem value="INSERT">INSERT</MenuItem>
                                <MenuItem value="UPDATE">UPDATE</MenuItem>
                                <MenuItem value="DELETE">DELETE</MenuItem>
                                <MenuItem value="MERGE">MERGE</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item>
                         <FormControl size="small" sx={{minWidth: 120}}>
                            <InputLabel>Impact</InputLabel>
                            <Select name="impact" label="Impact" value={filters.impact} onChange={handleFilterChange}>
                                <MenuItem value="">All</MenuItem>
                                <MenuItem value="Baixo">Low</MenuItem>
                                <MenuItem value="Médio">Medium</MenuItem>
                                <MenuItem value="Alto">High</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
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
                        <Tooltip title="Refresh Now">
                            <span>
                                <IconButton onClick={fetchData} disabled={loading}>
                                    {loading ? <CircularProgress size={24} /> : <RefreshIcon />}
                                </IconButton>
                            </span>
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
                <SummaryCard icon={<StorageIcon />} title="Total Estimated Volume" value={`${data?.summary.totalEstMB.toFixed(2) ?? '...'} MB`} />
                <SummaryCard icon={<LockIcon />} title="Blocking Locks Detected" value={data?.summary.detectedLocks ?? '...'} />
                <SummaryCard icon={<TableChartIcon />} title="Top Affected Table" value={data?.summary.topTable ?? '...'} />
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
                                <TableCell>{row.operation}</TableCell>
                                <TableCell>{row.mainTable}</TableCell>
                                <TableCell align="right">{row.durationSec}</TableCell>
                                <TableCell align="right">{row.estMB.toFixed(2)}</TableCell>
                                <TableCell>{row.impact}</TableCell>
                                <TableCell>
                                    <Tooltip title={row.sqlText} placement="top">
                                        <Typography variant="body2" noWrap sx={{maxWidth: '250px'}}>{row.waitEvent}</Typography>
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
}
const SummaryCard = ({ icon, title, value }: SummaryCardProps) => (
    <Grid item xs={12} sm={6} md={3}>
        <Card>
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    {icon}
                    <Typography variant="h6" sx={{ ml: 1 }}>{title}</Typography>
                </Box>
                <Typography variant="h4" align="center">{value}</Typography>
            </CardContent>
        </Card>
    </Grid>
);

const tableHeaders = [
    { id: 'sid', label: 'SID' },
    { id: 'owner', label: 'Owner' },
    { id: 'operation', label: 'Operation' },
    { id: 'mainTable', label: 'Main Table' },
    { id: 'durationSec', label: 'Duration (s)' },
    { id: 'estMB', label: 'Est. MB' },
    { id: 'impact', label: 'Impact' },
    { id: 'waitEvent', label: 'Wait/Event' },
];


export default Dashboard;
