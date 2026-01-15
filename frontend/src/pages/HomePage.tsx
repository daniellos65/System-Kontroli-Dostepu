import { useNavigate } from 'react-router-dom';
import {
  Button,
  Paper,
  Title,
  Text,
  Container,
  Group,
  Center,
  Box,
  Stack,
} from '@mantine/core';
import { IconShieldLock, IconQrcode, IconLockOpen } from '@tabler/icons-react';

export default function HomePage() {
  const navigate = useNavigate();

  return (
    // Główny kontener - cała wysokość ekranu, szare tło
    <Box style={{ minHeight: '100vh', backgroundColor: '#f8f9fa', display: 'flex', flexDirection: 'column' }}>

      {/* HEADER NA GÓRZE */}
      <Paper p="md" radius={0} shadow="xs" style={{ backgroundColor: '#1a1b1e', color: 'white', zIndex: 10 }}>
        <Container size="lg">
          <Group>
            <IconShieldLock size={24} color="#4dabf7" />
            <Text fw={700} style={{ letterSpacing: '1px', textTransform: 'uppercase' }}>
              System Kontroli Dostępu
            </Text>
          </Group>
        </Container>
      </Paper>

      {/* CENTROWANIE GŁÓWNEJ KARTY */}
      <Center style={{ flex: 1, padding: '20px' }}>
        <Container size={500} my={40}>
          <Title ta="center" fw={900} mb="xs">
            System kontroli dostępu
          </Title>
          <Text c="dimmed" size="sm" ta="center" mb={50}>
            Wybierz akcję, którą chcesz wykonać
          </Text>

          {/* GŁÓWNA KARTA Z PRZYCISKAMI */}
          <Paper withBorder shadow="md" p={40} radius="md">
            <Stack gap="lg">

              {/* PRZYCISK WERYFIKACJI */}
              <Button
                leftSection={<IconQrcode size={18} />}
                fullWidth
                size="lg"
                radius="md"
                color="green"
                onClick={() => navigate('/verify')}
                variant="light"
              >
                Zweryfikuj tożsamość
              </Button>

              {/* PRZYCISK ADMIN */}
              <Button
                leftSection={<IconLockOpen size={18} />}
                fullWidth
                size="lg"
                radius="md"
                color="blue"
                onClick={() => navigate('/admin')}
              >
                Panel Administratora
              </Button>

            </Stack>
          </Paper>

          {/* STOPKA */}
          <Text c="dimmed" size="xs" ta="center" mt="xl">
            &copy; 2024 Secure Systems Enterprise. Wszystkie połączenia są szyfrowane.
          </Text>
        </Container>
      </Center>
    </Box>
  );
}
