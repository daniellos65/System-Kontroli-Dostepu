import { useNavigate } from 'react-router-dom';
import {
  Button,
  Paper,
  Title,
  Text,
  Container,
  Group,
  Box,
  SimpleGrid,
} from '@mantine/core';
import { IconShieldLock, IconLogout, IconHistory, IconUsers } from '@tabler/icons-react';

export default function AdminDashboardPage() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/');
  };

  return (
    // Główny kontener
    <Box style={{ minHeight: '100vh', backgroundColor: '#f8f9fa', display: 'flex', flexDirection: 'column' }}>

      {/* HEADER NA GÓRZE */}
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

      {/* GŁÓWNA ZAWARTOŚĆ */}
      <Box style={{ flex: 1, padding: '40px 20px' }}>
        <Container size="lg">
          <Title fw={900} mb="lg">
            Panel Administratora
          </Title>
          <Text c="dimmed" size="md" mb={40}>
            Zarządzaj systemem kontroli dostępu
          </Text>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">

            {/* KARTA: LOGI WEJŚĆ */}
            <Paper withBorder p={30} radius="md" shadow="sm">
              <Group mb="lg">
                <IconHistory size={32} color="#4dabf7" />
                <div>
                  <Title order={3}>Logi wejść</Title>
                  <Text c="dimmed" size="sm">Przeglądaj historię wejść</Text>
                </div>
              </Group>
              <Text c="dimmed" size="sm" mb={20}>
                Funkcjonalność do wdrożenia - podgląd rejestracji wszystkich wejść pracowników
              </Text>
              <Button fullWidth radius="md" color="blue" variant="light" disabled>
                Przejdź do logów
              </Button>
            </Paper>

            {/* KARTA: ZARZĄDZANIE PRACOWNIKAMI */}
            <Paper withBorder p={30} radius="md" shadow="sm">
              <Group mb="lg">
                <IconUsers size={32} color="#4dabf7" />
                <div>
                  <Title order={3}>Pracownicy</Title>
                  <Text c="dimmed" size="sm">Zarządzaj danymi pracowników</Text>
                </div>
              </Group>
              <Text c="dimmed" size="sm" mb={20}>
                Dodawanie, edycja i usuwanie pracowników wraz z automatycznym generowaniem kodów QR
              </Text>
              <Button 
                fullWidth 
                radius="md" 
                color="blue" 
                variant="light"
                onClick={() => navigate('/admin/employees')}
              >
                Zarządzaj pracownikami
              </Button>
            </Paper>

          </SimpleGrid>
        </Container>
      </Box>
    </Box>
  );
}
