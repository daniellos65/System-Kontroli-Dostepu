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
  Image,
  Modal,
} from '@mantine/core';
import {
  IconShieldLock,
  IconLogout,
  IconArrowLeft,
  IconAlertCircle,
  IconCheck,
  IconX,
  IconDownload,
  IconFileTypePdf,
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
import jsPDF from 'jspdf';

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
  const [selectedLogImage, setSelectedLogImage] = useState<string | null>(null);
  const [selectedLogFilename, setSelectedLogFilename] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

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
    return `http://localhost:5001/uploads/logs/${filename}`;
  };

  const getEmployeePhotoUrl = (photoRef: string | null): string | null => {
    if (!photoRef) return null;
    return `${API_BASE_URL.replace('/api', '')}/uploads/references/${photoRef}`;
  };

  const downloadLogImage = async (filename: string) => {
    try {
      const url = getLogPhotoUrl(filename);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Błąd pobierania: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      
      // Sprawdź czy blob ma zawartość
      if (blob.size === 0) {
        throw new Error('Pobrany plik jest pusty');
      }
      
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      
      // Czekaj chwilę na rozpoczęcie pobierania, potem posprzątaj
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      }, 100);
      
    } catch (err) {
      console.error('Błąd podczas pobierania zdjęcia:', err);
      setError(`Nie udało się pobrać zdjęcia: ${err instanceof Error ? err.message : 'Nieznany błąd'}`);
    }
  };

  const generatePdfReport = async () => {
    if (!logs.length) {
      setError('Brak logów do wygenerowania raportu');
      return;
    }

    setGeneratingPdf(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageHeight = pdf.internal.pageSize.getHeight();
      const pageWidth = pdf.internal.pageSize.getWidth();
      let yPosition = 15;
      const margin = 12;
      const contentWidth = pageWidth - 2 * margin;

      // ============ NAGŁÓWEK ============
      pdf.setFontSize(18);
      pdf.setTextColor(31, 31, 31);
      pdf.text('RAPORT LOGÓW SYSTEMU KONTROLI DOSTĘPU', margin, yPosition);
      yPosition += 10;

      // Data wygenerowania
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      const generatedDate = new Date().toLocaleString('pl-PL');
      pdf.text(`Wygenerowano: ${generatedDate}`, margin, yPosition);
      yPosition += 8;

      // Linia oddzielająca
      pdf.setDrawColor(180, 180, 180);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 7;

      // ============ SEKCJA STATYSTYKI ============
      pdf.setFontSize(12);
      pdf.setTextColor(31, 31, 31);
      pdf.text('PODSUMOWANIE STATYSTYK', margin, yPosition);
      yPosition += 7;

      const successCount = logs.filter((l) => l.status === 'ok').length;
      const deniedCount = logs.filter((l) => l.status === 'denied').length;
      const successRate = logs.length > 0 ? ((successCount / logs.length) * 100).toFixed(1) : '0';

      // Statystyka w ramkach
      pdf.setFontSize(10);
      pdf.setTextColor(50, 50, 50);
      
      // Lewa kolumna
      pdf.text('Udane wejścia:', margin + 2, yPosition);
      pdf.setTextColor(0, 128, 0);
      pdf.setFontSize(11);
      pdf.text(successCount.toString(), margin + 50, yPosition);
      yPosition += 7;

      // Druga pozycja
      pdf.setTextColor(50, 50, 50);
      pdf.setFontSize(10);
      pdf.text('Odrzucone wejścia:', margin + 2, yPosition);
      pdf.setTextColor(255, 0, 0);
      pdf.setFontSize(11);
      pdf.text(deniedCount.toString(), margin + 50, yPosition);
      yPosition += 7;

      // Trzecia pozycja
      pdf.setTextColor(50, 50, 50);
      pdf.setFontSize(10);
      pdf.text('Współczynnik sukcesu:', margin + 2, yPosition);
      pdf.setTextColor(0, 102, 204);
      pdf.setFontSize(11);
      pdf.text(`${successRate}%`, margin + 50, yPosition);
      yPosition += 7;

      // Czwarta pozycja
      pdf.setTextColor(50, 50, 50);
      pdf.setFontSize(10);
      pdf.text('Liczba logów:', margin + 2, yPosition);
      pdf.setTextColor(31, 31, 31);
      pdf.setFontSize(11);
      pdf.text(logs.length.toString(), margin + 50, yPosition);
      yPosition += 10;

      // Linia oddzielająca
      pdf.setDrawColor(180, 180, 180);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 7;

      // ============ SEKCJA SZCZEGÓŁOWYCH LOGÓW ============
      pdf.setFontSize(12);
      pdf.setTextColor(31, 31, 31);
      pdf.text('SZCZEGÓŁOWE LOGI WEJŚĆ', margin, yPosition);
      yPosition += 8;

      // Nagłówki tabeli
      pdf.setFontSize(9);
      pdf.setFillColor(230, 230, 230);
      pdf.rect(margin, yPosition - 5, contentWidth, 6, 'F');
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('', 'bold');
      
      const colWidths = {
        status: 22,
        id: 18,
        name: 50,
        time: 38,
        result: 18
      };
      
      let xPos = margin + 2;
      pdf.text('Status', xPos, yPosition);
      xPos += colWidths.status;
      pdf.text('ID', xPos, yPosition);
      xPos += colWidths.id;
      pdf.text('Imię i Nazwisko', xPos, yPosition);
      xPos += colWidths.name;
      pdf.text('Data i Godzina', xPos, yPosition);
      xPos += colWidths.time;
      pdf.text('Wynik', xPos, yPosition);
      
      yPosition += 8;
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 3;

      // Dane logów
      pdf.setFont('', 'normal');
      pdf.setFontSize(8);

      for (const log of logs) {
        // Sprawdź czy jest miejsce na nową linię (musimy zarezerwować miejsce)
        if (yPosition > pageHeight - 25) {
          pdf.addPage();
          yPosition = 15;
          
          // Powt\u00f3rz nagłówki na nowej stronie
          pdf.setFontSize(9);
          pdf.setFillColor(230, 230, 230);
          pdf.rect(margin, yPosition - 5, contentWidth, 6, 'F');
          pdf.setTextColor(0, 0, 0);
          pdf.setFont('', 'bold');
          
          xPos = margin + 2;
          pdf.text('Status', xPos, yPosition);
          xPos += colWidths.status;
          pdf.text('ID', xPos, yPosition);
          xPos += colWidths.id;
          pdf.text('Imię i Nazwisko', xPos, yPosition);
          xPos += colWidths.name;
          pdf.text('Data i Godzina', xPos, yPosition);
          xPos += colWidths.time;
          pdf.text('Wynik', xPos, yPosition);
          
          yPosition += 8;
          pdf.setDrawColor(200, 200, 200);
          pdf.line(margin, yPosition, pageWidth - margin, yPosition);
          yPosition += 3;
          
          pdf.setFont('', 'normal');
          pdf.setFontSize(8);
        }

        xPos = margin + 2;
        
        // Status
        const statusText = log.status === 'ok' ? 'UDANE' : 'ODRZUCONE';
        if (log.status === 'ok') {
          pdf.setTextColor(0, 128, 0);
        } else {
          pdf.setTextColor(255, 0, 0);
        }
        pdf.text(statusText, xPos, yPosition);
        
        // ID
        pdf.setTextColor(0, 0, 0);
        xPos += colWidths.status;
        pdf.text(log.user_id.toString(), xPos, yPosition);
        
        // Pracownik (skrócona nazwa)
        xPos += colWidths.id;
        const nameParts = log.employee_name.split(' ');
        const displayName = nameParts.length > 1 
          ? `${nameParts[0]} ${(nameParts[1] || '')[0] || ''}.`
          : log.employee_name.substring(0, 20);
        pdf.text(displayName, xPos, yPosition, { maxWidth: colWidths.name - 2 });
        
        // Data i godzina
        xPos += colWidths.name;
        const formattedTime = formatTimestamp(log.timestamp);
        pdf.text(formattedTime, xPos, yPosition, { maxWidth: colWidths.time - 2 });
        
        // Wynik (symbol + tekst)
        xPos += colWidths.time;
        if (log.status === 'ok') {
          pdf.setTextColor(0, 128, 0);
          pdf.text('✓ OK', xPos, yPosition);
        } else {
          pdf.setTextColor(255, 0, 0);
          pdf.text('✗ DENY', xPos, yPosition);
        }
        
        yPosition += 5;
        
        // Linia separatora
        pdf.setDrawColor(245, 245, 245);
        pdf.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 1;
      }

      // ============ STOPKA ============
      yPosition += 5;
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      const totalPages = pdf.internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.text(
          `Strona ${i} z ${totalPages}`,
          pageWidth / 2,
          pageHeight - 8,
          { align: 'center' }
        );
      }

      // Pobierz PDF
      const filename = `raport-logi-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(filename);
    } catch (err) {
      console.error('Błąd podczas generowania PDF:', err);
      setError('Błąd podczas generowania raportu PDF');
    } finally {
      setGeneratingPdf(false);
    }
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
            <>
              {/* PRZYCISK WYGENERUJ RAPORT */}
              <Group justify="flex-end" mb="lg">
                <Button
                  leftSection={<IconFileTypePdf size={16} />}
                  color="red"
                  onClick={generatePdfReport}
                  loading={generatingPdf}
                  disabled={logs.length === 0}
                >
                  Wygeneruj raport PDF
                </Button>
              </Group>

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
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'scale(1.02)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1)';
                              }}
                            >
                              {/* Zdjęcie z logów */}
                              <Box mb="sm" style={{ cursor: 'pointer' }}>
                                <Image
                                  src={getLogPhotoUrl(log.filename)}
                                  alt="Log verification"
                                  radius="md"
                                  onClick={() => {
                                    setSelectedLogImage(getLogPhotoUrl(log.filename));
                                    setSelectedLogFilename(log.filename);
                                  }}
                                  style={{
                                    transition: 'all 0.2s ease',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.filter = 'brightness(0.9)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.filter = 'brightness(1)';
                                  }}
                                />
                              </Box>

                              {/* Przycisk pobrania zdjęcia */}
                              <Button
                                size="xs"
                                variant="light"
                                fullWidth
                                mb="sm"
                                leftSection={<IconDownload size={12} />}
                                onClick={() => downloadLogImage(log.filename)}
                              >
                                Pobierz zdjęcie
                              </Button>

                              <Group gap="sm" mb="sm">
                                <Avatar
                                  src={getEmployeePhotoUrl(log.photo_ref)}
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
            </>
          )}

          {/* MODAL DO WYŚWIETLANIA DUŻEGO ZDJĘCIA */}
          <Modal
            opened={!!selectedLogImage}
            onClose={() => {
              setSelectedLogImage(null);
              setSelectedLogFilename(null);
            }}
            title="Zdjęcie z weryfikacji"
            size="lg"
            centered
          >
            {selectedLogImage && (
              <Stack gap="md">
                <Image src={selectedLogImage} alt="Log verification" radius="md" />
                <Button
                  leftSection={<IconDownload size={16} />}
                  fullWidth
                  onClick={() => {
                    if (selectedLogFilename) {
                      downloadLogImage(selectedLogFilename);
                    }
                  }}
                >
                  Pobierz zdjęcie
                </Button>
              </Stack>
            )}
          </Modal>
        </Container>
      </Box>
    </Box>
  );
}
