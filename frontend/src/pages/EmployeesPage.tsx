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
  IconEdit,
  IconCalendar,
  IconClock,
} from '@tabler/icons-react';

interface Employee {
  employee_id: number;
  first_name: string;
  last_name: string;
  photo_ref: string;
  qr_code_uuid: string;
  qr_valid_until: string; // ISO datetime string
}

const API_BASE_URL = 'http://localhost:5001/api';

export default function EmployeesPage() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; name: string } | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editFormData, setEditFormData] = useState({
    firstName: '',
    lastName: '',
    photo: null as File | null,
  });
  const [showRenewQRModal, setShowRenewQRModal] = useState(false);
  const [renewingEmployee, setRenewingEmployee] = useState<Employee | null>(null);
  const [newQRValidDate, setNewQRValidDate] = useState<string>('');

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
      alert(`Pracownik ${formData.firstName} ${formData.lastName} został dodany!`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Błąd podczas dodawania pracownika';
      setError(message);
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEmployee = async (employeeId: number, name: string) => {
    console.log(`[DELETE] Opening confirmation for employee ID=${employeeId}`);
    setDeleteConfirm({ id: employeeId, name });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    
    const { id: employeeId, name } = deleteConfirm;
    console.log(`[DELETE] Confirmed deletion for employee ID=${employeeId}`);
    setDeleteConfirm(null);

    try {
      setError(null);
      const url = `${API_BASE_URL}/admin/employees/${employeeId}`;
      console.log(`[DELETE] Sending DELETE request to: ${url}`);
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log(`[DELETE] Response status: ${response.status}`);

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`[DELETE ERROR]`, errorData);
        throw new Error(errorData.message || 'Błąd podczas usuwania pracownika');
      }

      console.log(`[DELETE] Success! Refreshing list...`);
      // Odśwież listę
      await fetchEmployees();
      alert(`Pracownik ${name} został usunięty`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Błąd podczas usuwania pracownika';
      setError(message);
      console.error(`[DELETE CATCH]`, err);
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

      console.log(`Pobrano kod QR dla ${firstName} ${lastName}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Błąd podczas pobierania QR';
      setError(message);
      console.error(err);
    }
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setEditFormData({
      firstName: employee.first_name,
      lastName: employee.last_name,
      photo: null,
    });
    setShowEditModal(true);
    setError(null);
  };

  const handleUpdateEmployee = async () => {
    if (!editingEmployee) return;

    if (!editFormData.firstName.trim() || !editFormData.lastName.trim()) {
      setError('Imię i nazwisko są wymagane');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const form = new FormData();
      form.append('first_name', editFormData.firstName.trim());
      form.append('last_name', editFormData.lastName.trim());
      
      // Jeśli użytkownik wybrał nowe zdjęcie, dodaj je
      if (editFormData.photo) {
        form.append('photo', editFormData.photo);
      }

      const response = await fetch(`${API_BASE_URL}/admin/employees/${editingEmployee.employee_id}`, {
        method: 'PUT',
        body: form,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Błąd podczas edycji pracownika');
      }

      const data = await response.json();
      console.log('Pracownik zaktualizowany:', data);

      // Reset formularza i odśwież listę
      setEditingEmployee(null);
      setEditFormData({ firstName: '', lastName: '', photo: null });
      setShowEditModal(false);
      await fetchEmployees();

      // Pokaż komunikat sukcesu
      alert(`Pracownik ${editFormData.firstName} ${editFormData.lastName} został zaktualizowany!`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Błąd podczas edycji pracownika';
      setError(message);
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRenewQRValidity = (employee: Employee) => {
    setRenewingEmployee(employee);
    // Ustaw domyślną datę na 1 rok od dzisiaj
    const tomorrow = new Date();
    tomorrow.setFullYear(tomorrow.getFullYear() + 1);
    setNewQRValidDate(tomorrow.toISOString().split('T')[0]);
    setShowRenewQRModal(true);
    setError(null);
  };

  const handleSaveQRValidity = async () => {
    if (!renewingEmployee || !newQRValidDate) {
      setError('Wybierz datę ważności');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Konwertuj datę na format datetime (koniec dnia)
      const validUntilDate = new Date(newQRValidDate);
      validUntilDate.setHours(23, 59, 59, 999);
      const validUntilString = validUntilDate.toISOString();

      const response = await fetch(`${API_BASE_URL}/admin/employees/${renewingEmployee.employee_id}/qr-validity`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          qr_valid_until: validUntilString,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Błąd podczas przedłużania kodu QR');
      }

      console.log('Data ważności kodu QR przedłużona');

      // Reset modala i odśwież listę
      setRenewingEmployee(null);
      setNewQRValidDate('');
      setShowRenewQRModal(false);
      await fetchEmployees();

      // Pokaż komunikat sukcesu
      alert(`Kod QR dla ${renewingEmployee.first_name} ${renewingEmployee.last_name} przedłużony do ${newQRValidDate}!`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Błąd podczas przedłużania kodu QR';
      setError(message);
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const formatQRValidDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('pl-PL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(date);
    } catch {
      return dateString;
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
                    <Table.Th>Data ważności QR</Table.Th>
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
                        <Group gap="xs">
                          <IconCalendar size={16} style={{ opacity: 0.6 }} />
                          <div>
                            <Text size="sm">{formatQRValidDate(emp.qr_valid_until)}</Text>
                            <Text size="xs" c="dimmed">
                              {new Date(emp.qr_valid_until) < new Date() ? '⚠️ WYGASŁ' : 'Ważny'}
                            </Text>
                          </div>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Group justify="flex-end" gap="xs">
                          <Tooltip label="Edytuj pracownika">
                            <ActionIcon
                              color="blue"
                              variant="light"
                              onClick={() => handleEditEmployee(emp)}
                            >
                              <IconEdit size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Przedłuż kod QR">
                            <ActionIcon
                              color="grape"
                              variant="light"
                              onClick={() => handleRenewQRValidity(emp)}
                            >
                              <IconClock size={16} />
                            </ActionIcon>
                          </Tooltip>
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

      {/* MODAL: POTWIERDZENIE USUWANIA */}
      <Modal
        opened={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Potwierdzenie usuwania"
        centered
        size="sm"
      >
        <Stack>
          <Text>
            Czy na pewno chcesz usunąć pracownika <strong>{deleteConfirm?.name}</strong>?
          </Text>
          <Text c="red" size="sm">
             Ta akcja jest nieodwracalna - pracownik, jego zdjęcie i kod QR zostaną usunięte.
          </Text>
          <Group justify="space-between">
            <Button
              variant="subtle"
              onClick={() => setDeleteConfirm(null)}
            >
              Anuluj
            </Button>
            <Button
              color="red"
              onClick={confirmDelete}
            >
              Usuń pracownika
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* MODAL: EDYTUJ PRACOWNIKA */}
      <Modal
        opened={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingEmployee(null);
          setEditFormData({ firstName: '', lastName: '', photo: null });
          setError(null);
        }}
        title="Edytuj pracownika"
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
            value={editFormData.firstName}
            onChange={(e) => setEditFormData({ ...editFormData, firstName: e.currentTarget.value })}
            disabled={submitting}
          />

          <TextInput
            label="Nazwisko"
            placeholder="np. Kowalski"
            value={editFormData.lastName}
            onChange={(e) => setEditFormData({ ...editFormData, lastName: e.currentTarget.value })}
            disabled={submitting}
          />

          <FileInput
            label="Nowe zdjęcie pracownika (opcjonalne)"
            placeholder="Wybierz zdjęcie (PNG, JPG, JPEG, GIF)"
            accept="image/*"
            value={editFormData.photo}
            onChange={(file) => setEditFormData({ ...editFormData, photo: file })}
            disabled={submitting}
          />
          
          <Text c="dimmed" size="sm">
            {editFormData.photo ? '✓ Nowe zdjęcie będzie załadowane.' : 'Jeśli wybierzesz nowe zdjęcie, stare zostanie usunięte i wygeneruje się nowy kod QR.'}
          </Text>

          <Group justify="space-between" mt="lg">
            <Button
              variant="subtle"
              onClick={() => {
                setShowEditModal(false);
                setEditingEmployee(null);
                setEditFormData({ firstName: '', lastName: '', photo: null });
                setError(null);
              }}
              disabled={submitting}
            >
              Anuluj
            </Button>
            <Button
              color="blue"
              onClick={handleUpdateEmployee}
              loading={submitting}
              disabled={!editFormData.firstName.trim() || !editFormData.lastName.trim()}
            >
              Zapisz zmiany
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* MODAL: PRZEDŁUŻ WAŻNOŚĆ KODU QR */}
      <Modal
        opened={showRenewQRModal}
        onClose={() => {
          setShowRenewQRModal(false);
          setRenewingEmployee(null);
          setNewQRValidDate('');
          setError(null);
        }}
        title="Przedłuż ważność kodu QR"
        centered
        size="md"
      >
        <Stack>
          {error && (
            <Alert icon={<IconAlertCircle size={16} />} color="red" title="Błąd">
              {error}
            </Alert>
          )}

          {renewingEmployee && (
            <Text>
              Przedłużanie kodu QR dla: <strong>{renewingEmployee.first_name} {renewingEmployee.last_name}</strong>
            </Text>
          )}

          <div>
            <Text size="sm" fw={500} mb="xs">Obecna data ważności</Text>
            <Text size="sm" c="dimmed">
              {renewingEmployee ? formatQRValidDate(renewingEmployee.qr_valid_until) : ''}
            </Text>
          </div>

          <TextInput
            type="date"
            label="Nowa data ważności"
            value={newQRValidDate}
            onChange={(e) => setNewQRValidDate(e.currentTarget.value)}
            disabled={submitting}
            required
          />

          <Text size="xs" c="dimmed">
            Kod QR będzie ważny do końca wybranego dnia (23:59:59).
          </Text>

          <Group justify="space-between" mt="lg">
            <Button
              variant="subtle"
              onClick={() => {
                setShowRenewQRModal(false);
                setRenewingEmployee(null);
                setNewQRValidDate('');
                setError(null);
              }}
              disabled={submitting}
            >
              Anuluj
            </Button>
            <Button
              color="grape"
              onClick={handleSaveQRValidity}
              loading={submitting}
              disabled={!newQRValidDate}
            >
              Przedłuż ważność
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
