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
  Table,
  Modal,
  FileInput,
  TextInput,
  Stack,
  Alert,
  Loader,
  Center,
  ActionIcon,
  Tooltip,
  Avatar,
} from '@mantine/core';
import {
  IconShieldLock,
  IconLogout,
  IconArrowLeft,
  IconPlus,
  IconTrash,
  IconAlertCircle,
  IconDownload,
} from '@tabler/icons-react';

interface Employee {
  employee_id: number;
  first_name: string;
  last_name: string;
  photo_ref: string;
  qr_code_uuid: string;
}

const API_BASE_URL = 'http://localhost:5001/api';

export default function EmployeesPage() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Dane formularza dodawania pracownika
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    photo: null as File | null,
  });

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/');
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE_URL}/admin/employees`);

      if (!response.ok) {
        throw new Error('Nie udało się pobrać listy pracowników');
      }

      const data = await response.json();
      setEmployees(data.employees || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas pobierania pracowników');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleAddEmployee = async () => {
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.photo) {
      setError('Wypełnij wszystkie pola i wybierz zdjęcie');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const form = new FormData();
      form.append('first_name', formData.firstName.trim());
      form.append('last_name', formData.lastName.trim());
      form.append('photo', formData.photo);

      const response = await fetch(`${API_BASE_URL}/admin/employees`, {
        method: 'POST',
        body: form,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Błąd podczas dodawania pracownika');
      }

      const data = await response.json();
      console.log('Pracownik dodany:', data);

      // Reset formularza i odśwież listę
      setFormData({ firstName: '', lastName: '', photo: null });
      setShowAddModal(false);
      await fetchEmployees();

      // Pokaż komunikat sukcesu
      alert(`✅ Pracownik ${formData.firstName} ${formData.lastName} został dodany!`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Błąd podczas dodawania pracownika';
      setError(message);
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEmployee = async (employeeId: number, name: string) => {
    if (!window.confirm(`Czy na pewno chcesz usunąć pracownika ${name}?`)) {
      return;
    }

    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/admin/employees/${employeeId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Błąd podczas usuwania pracownika');
      }

      // Odśwież listę
      await fetchEmployees();
      alert(`✅ Pracownik ${name} został usunięty`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Błąd podczas usuwania pracownika';
      setError(message);
      console.error(err);
    }
  };

  const handleDownloadQR = async (employeeId: number, firstName: string, lastName: string) => {
    try {
      const response = await fetch(`http://localhost:5001/api/admin/employees/${employeeId}/qr`);

      if (!response.ok) {
        throw new Error('Nie udało się pobrać kodu QR');
      }

      // Pobieranie pliku
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${employeeId}_${firstName}_${lastName}_qr.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log(`✅ Pobrano kod QR dla ${firstName} ${lastName}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Błąd podczas pobierania QR';
      setError(message);
      console.error(err);
    }
  };

  return (
    <Box style={{ minHeight: '100vh', backgroundColor: '#f8f9fa', display: 'flex', flexDirection: 'column' }}>
      {/* HEADER */}
      <Paper p="md" radius={0} shadow="xs" style={{ backgroundColor: '#1a1b1e', color: 'white' }}>
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

      {/* GŁÓWNA ZAWARTOŚĆ */}
      <Box style={{ flex: 1, padding: '40px 20px' }}>
        <Container size="lg">
          {/* Przycisk powrotu */}
          <Button
            leftSection={<IconArrowLeft size={16} />}
            variant="subtle"
            mb="lg"
            onClick={() => navigate('/admin/dashboard')}
          >
            Powrót do panelu
          </Button>

          {/* Tytuł */}
          <Group justify="space-between" mb="lg">
            <div>
              <Title fw={900}>Zarządzanie Pracownikami</Title>
              <Text c="dimmed" size="md">
                Dodaj, edytuj lub usuń pracowników w systemie
              </Text>
            </div>
            <Button
              leftSection={<IconPlus size={16} />}
              color="blue"
              size="md"
              onClick={() => setShowAddModal(true)}
            >
              Dodaj pracownika
            </Button>
          </Group>

          {/* Komunikat błędu */}
          {error && (
            <Alert icon={<IconAlertCircle size={16} />} color="red" mb="lg" title="Błąd">
              {error}
            </Alert>
          )}

          {/* Tabela pracowników */}
          <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
            {loading ? (
              <Center p="lg">
                <Loader />
              </Center>
            ) : employees.length === 0 ? (
              <Center p="lg">
                <Text c="dimmed">Brak pracowników w systemie</Text>
              </Center>
            ) : (
              <Table>
                <Table.Thead style={{ backgroundColor: '#f1f3f5' }}>
                  <Table.Tr>
                    <Table.Th style={{ width: '10%' }}>Zdjęcie</Table.Th>
                    <Table.Th>Imię</Table.Th>
                    <Table.Th>Nazwisko</Table.Th>
                    <Table.Th style={{ width: '15%' }} align="right">
                      Akcje
                    </Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {employees.map((emp) => (
                    <Table.Tr key={emp.employee_id}>
                      <Table.Td>
                        <Avatar
                          size="md"
                          radius="md"
                          src={
                            emp.photo_ref
                              ? `http://localhost:5001/uploads/references/${emp.photo_ref}`
                              : null
                          }
                          alt={`${emp.first_name} ${emp.last_name}`}
                          color="blue"
                        >
                          {emp.first_name[0]}
                        </Avatar>
                      </Table.Td>
                      <Table.Td>{emp.first_name}</Table.Td>
                      <Table.Td>{emp.last_name}</Table.Td>
                      <Table.Td>
                        <Group justify="flex-end" gap="xs">
                          <Tooltip label="Pobierz kod QR">
                            <ActionIcon
                              color="blue"
                              variant="light"
                              onClick={() =>
                                handleDownloadQR(emp.employee_id, emp.first_name, emp.last_name)
                              }
                            >
                              <IconDownload size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Usuń pracownika">
                            <ActionIcon
                              color="red"
                              variant="light"
                              onClick={() =>
                                handleDeleteEmployee(emp.employee_id, `${emp.first_name} ${emp.last_name}`)
                              }
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Paper>
        </Container>
      </Box>

      {/* MODAL: DODAJ PRACOWNIKA */}
      <Modal
        opened={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setFormData({ firstName: '', lastName: '', photo: null });
          setError(null);
        }}
        title="Dodaj nowego pracownika"
        centered
        size="md"
      >
        <Stack>
          {error && (
            <Alert icon={<IconAlertCircle size={16} />} color="red" title="Błąd">
              {error}
            </Alert>
          )}

          <TextInput
            label="Imię"
            placeholder="np. Jan"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.currentTarget.value })}
            disabled={submitting}
          />

          <TextInput
            label="Nazwisko"
            placeholder="np. Kowalski"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.currentTarget.value })}
            disabled={submitting}
          />

          <FileInput
            label="Zdjęcie pracownika"
            placeholder="Wybierz zdjęcie (PNG, JPG, JPEG, GIF)"
            accept="image/*"
            value={formData.photo}
            onChange={(file) => setFormData({ ...formData, photo: file })}
            disabled={submitting}
          />

          <Group justify="space-between" mt="lg">
            <Button
              variant="subtle"
              onClick={() => {
                setShowAddModal(false);
                setFormData({ firstName: '', lastName: '', photo: null });
                setError(null);
              }}
              disabled={submitting}
            >
              Anuluj
            </Button>
            <Button
              color="blue"
              onClick={handleAddEmployee}
              loading={submitting}
              disabled={!formData.firstName.trim() || !formData.lastName.trim() || !formData.photo}
            >
              Dodaj pracownika
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
