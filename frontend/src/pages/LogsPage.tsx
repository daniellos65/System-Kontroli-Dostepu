import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Paper,
  Title,
  Text,
  Container,
  Group,
  Box,
  Avatar,
  Badge,
  Loader,
  Center,
  Stack,
  Grid,
  ScrollArea,
  Alert,
} from '@mantine/core';
import {
  IconShieldLock,
  IconLogout,
  IconArrowLeft,
  IconAlertCircle,
  IconCheck,
  IconX,
} from '@tabler/icons-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface LogEntry {
  filename: string;
  status: 'ok' | 'denied';
  user_id: number;
  employee_name: string;
  photo_ref: string | null;
  timestamp: string;
}

const API_BASE_URL = 'http://localhost:5001/api';

export default function LogsPage() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<
    Array<{ date: string; ok: number; denied: number }>
  >([]);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/');
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE_URL}/admin/logs`);

      if (!response.ok) {
        throw new Error('Nie udało się pobrać logów');
      }

      const data = await response.json();
      const logsData = data.logs || [];
      
      setLogs(logsData);
      
      // Przetwórz dane dla wykresu
      const statsMap = new Map<
        string,
        { ok: number; denied: number }
      >();

      logsData.forEach((log: LogEntry) => {
        // Extrakcja daty z timestamp (YYYYMMDD_HHMMSS)
        const date = log.timestamp.substring(0, 8);
        // Formatowanie: YYYY-MM-DD
        const formattedDate = `${date.substring(0, 4)}-${date.substring(
          4,
          6
        )}-${date.substring(6, 8)}`;

        if (!statsMap.has(formattedDate)) {
          statsMap.set(formattedDate, { ok: 0, denied: 0 });
        }

        const stats = statsMap.get(formattedDate)!;
        if (log.status === 'ok') {
          stats.ok++;
        } else {
          stats.denied++;
        }
      });

      // Konwersja na tablicę, posortowaną chronologicznie
      const chartDataArray = Array.from(statsMap, ([date, stats]) => ({
        date,
        ...stats,
      })).sort((a, b) => a.date.localeCompare(b.date));

      setChartData(chartDataArray);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas pobierania logów');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Formatowanie timestampa
  const formatTimestamp = (timestamp: string): string => {
    // Format: YYYYMMDD_HHMMSS -> HH:MM:SS DD.MM.YYYY
    if (timestamp.length >= 15) {
      const date = timestamp.substring(0, 8);
      const time = timestamp.substring(9, 15);
      
      const year = date.substring(0, 4);
      const month = date.substring(4, 6);
      const day = date.substring(6, 8);
      
      const hour = time.substring(0, 2);
      const minute = time.substring(2, 4);
      const second = time.substring(4, 6);
      
      return `${hour}:${minute}:${second} ${day}.${month}.${year}`;
    }
    return timestamp;
  };

  // Pobierz zdjęcie z logów
  const getLogPhotoUrl = (filename: string): string => {
    return `${API_BASE_URL.replace('/api', '')}/uploads/logs/${filename}`;
  };

  const getEmployeePhotoUrl = (photoRef: string | null): string | null => {
    if (!photoRef) return null;
    return `${API_BASE_URL.replace('/api', '')}/uploads/references/${photoRef}`;
  };

  return (
    <Box style={{ minHeight: '100vh', backgroundColor: '#f8f9fa', display: 'flex', flexDirection: 'column' }}>
      {/* HEADER */}
      <Paper p="md" radius={0} shadow="xs" style={{ backgroundColor: '#1a1b1e', color: 'white', zIndex: 10 }}>
        <Container size="lg">
          <Group justify="space-between">
            <Group>
              <IconShieldLock size={24} color="#4dabf7" />
              <Text fw={700} style={{ letterSpacing: '1px', textTransform: 'uppercase' }}>
                System Kontroli Dostępu
              </Text>
            </Group>
            <Button
              leftSection={<IconLogout size={16} />}
              color="red"
              variant="subtle"
              onClick={handleLogout}
            >
              Wyloguj
            </Button>
          </Group>
        </Container>
      </Paper>

      {/* ZAWARTOŚĆ */}
      <Box style={{ flex: 1, padding: '40px 20px' }}>
        <Container size="lg">
          <Group mb="lg">
            <Button
              variant="subtle"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => navigate('/admin/dashboard')}
            >
              Wróć do panelu
            </Button>
          </Group>

          <Title fw={900} mb="lg">
            Logi wejść
          </Title>

          {error && (
            <Alert icon={<IconAlertCircle size={16} />} title="Błąd" color="red" mb="lg">
              {error}
            </Alert>
          )}

          {loading ? (
            <Center style={{ minHeight: '500px' }}>
              <Loader size="lg" />
            </Center>
          ) : (
            <Grid gutter="lg" style={{ minHeight: '600px' }}>
              {/* LEWA STRONA: LISTA LOGÓW */}
              <Grid.Col span={{ base: 12, sm: 12, md: 6 }}>
                <Paper withBorder p="lg" radius="md" shadow="sm">
                  <Title order={4} mb="lg">
                    Historia wejść ({logs.length})
                  </Title>

                  <ScrollArea style={{ height: '600px' }}>
                    <Stack gap="sm">
                      {logs.length === 0 ? (
                        <Text c="dimmed" ta="center">
                          Brak logów
                        </Text>
                      ) : (
                        logs.map((log, index) => (
                          <Paper
                            key={index}
                            withBorder
                            p="sm"
                            radius="md"
                            style={{
                              backgroundColor:
                                log.status === 'ok' ? '#f0fdf4' : '#fef2f2',
                              borderColor: log.status === 'ok' ? '#86efac' : '#fca5a5',
                              borderWidth: 2,
                            }}
                          >
                            <Group gap="sm" mb="sm">
                              <Avatar
                                src={
                                  getEmployeePhotoUrl(log.photo_ref) ||
                                  getLogPhotoUrl(log.filename)
                                }
                                size="lg"
                                radius="md"
                              />
                              <div style={{ flex: 1 }}>
                                <Text fw={600} size="sm">
                                  {log.employee_name}
                                </Text>
                                <Text size="xs" c="dimmed">
                                  ID: {log.user_id}
                                </Text>
                              </div>
                              <Badge
                                color={log.status === 'ok' ? 'green' : 'red'}
                                variant="filled"
                                leftSection={
                                  log.status === 'ok' ? (
                                    <IconCheck size={14} />
                                  ) : (
                                    <IconX size={14} />
                                  )
                                }
                              >
                                {log.status === 'ok' ? 'Udane' : 'Odrzucone'}
                              </Badge>
                            </Group>

                            <Text size="xs" c="dimmed">
                              {formatTimestamp(log.timestamp)}
                            </Text>
                          </Paper>
                        ))
                      )}
                    </Stack>
                  </ScrollArea>
                </Paper>
              </Grid.Col>

              {/* PRAWA STRONA: WYKRES */}
              <Grid.Col span={{ base: 12, sm: 12, md: 6 }}>
                <Paper withBorder p="lg" radius="md" shadow="sm">
                  <Title order={4} mb="lg">
                    Statystyka wejść
                  </Title>

                  {chartData.length === 0 ? (
                    <Center style={{ height: '400px' }}>
                      <Text c="dimmed">Brak danych do wyświetlenia</Text>
                    </Center>
                  ) : (
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="ok" fill="#3b82f6" name="Udane wejścia" />
                        <Bar dataKey="denied" fill="#ef4444" name="Odrzucone wejścia" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}

                  {/* STATYSTYKA */}
                  <Stack gap="sm" mt="xl">
                    <Paper p="sm" style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac' }} radius="md">
                      <Text size="sm" c="dimmed">
                        Udane wejścia
                      </Text>
                      <Text fw={700} size="lg" c="green">
                        {logs.filter((l) => l.status === 'ok').length}
                      </Text>
                    </Paper>
                    <Paper p="sm" style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5' }} radius="md">
                      <Text size="sm" c="dimmed">
                        Odrzucone wejścia
                      </Text>
                      <Text fw={700} size="lg" c="red">
                        {logs.filter((l) => l.status === 'denied').length}
                      </Text>
                    </Paper>
                    <Paper p="sm" style={{ backgroundColor: '#f3f4f6', border: '1px solid #d1d5db' }} radius="md">
                      <Text size="sm" c="dimmed">
                        Współczynnik sukcesu
                      </Text>
                      <Text fw={700} size="lg" c="blue">
                        {logs.length === 0
                          ? '0%'
                          : `${(
                              (logs.filter((l) => l.status === 'ok').length / logs.length) *
                              100
                            ).toFixed(1)}%`}
                      </Text>
                    </Paper>
                  </Stack>
                </Paper>
              </Grid.Col>
            </Grid>
          )}
        </Container>
      </Box>
    </Box>
  );
}
