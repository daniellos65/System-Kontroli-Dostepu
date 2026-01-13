import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TextInput,
  PasswordInput,
  Button,
  Paper,
  Title,
  Text,
  Container,
  Group,
  Alert,
  Center,
  Box,
  Stack,
} from '@mantine/core';
import { IconAt, IconLock, IconAlertCircle, IconArrowLeft, IconShieldLock } from '@tabler/icons-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // --- LOGIKA POZOSTAŁA BEZ ZMIAN ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const apiUrl = `http://${window.location.hostname}:5000/api/admin/login`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          login: username,
          password: password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.token) {
          localStorage.setItem('admin_token', data.token);
        }
        navigate('/admin/dashboard');
      } else {
        setError(data.message || 'Błąd logowania');
      }
    } catch (err) {
      setError('Błąd połączenia z serwerem');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  // ----------------------------------

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

      {/* CENTROWANIE KARTY LOGOWANIA */}
      <Center style={{ flex: 1, padding: '20px' }}>
        <Container size={420} my={40}>
          <Title ta="center" fw={900}>
            Witamy ponownie!
          </Title>
          <Text c="dimmed" size="sm" ta="center" mt={5} mb={30}>
            Zaloguj się do panelu administratora, aby kontynuować.
          </Text>

          {/* KARTA (PAPER) Z CIEŃIEM I ZAOKRĄGLENIAMI */}
          <Paper withBorder shadow="md" p={30} mt={30} radius="md">

            {/* ALERT O BŁĘDZIE */}
            {error && (
              <Alert icon={<IconAlertCircle size={16} />} title="Wystąpił błąd!" color="red" mb="lg" variant="light">
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <Stack gap="md">
                {/* PROFESJONALNY INPUT TEKSTOWY */}
                <TextInput
                  label="Nazwa użytkownika"
                  placeholder="twój@email.pl"
                  leftSection={<IconAt size={16} />}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  radius="md"
                />

                {/* PROFESJONALNY INPUT HASŁA (z okiem do podglądu) */}
                <PasswordInput
                  label="Hasło"
                  placeholder="Twoje hasło"
                  leftSection={<IconLock size={16} />}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  radius="md"
                />
              </Stack>

              {/* GŁÓWNY PRZYCISK LOGOWANIA */}
              <Button
                type="submit"
                fullWidth
                mt="xl"
                size="md"
                loading={loading}
                loaderProps={{ type: 'dots' }}
                radius="md"
                color="blue" // Kolor wiodący
              >
                Zaloguj się bezpiecznie
              </Button>
            </form>
          </Paper>

          {/* PRZYCISK POWROTU (Subtelny) */}
          <Center mt="lg">
            <Button
              variant="subtle"
              color="gray"
              size="sm"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => navigate('/')}
            >
              Wróć do strony głównej
            </Button>
          </Center>

          <Text c="dimmed" size="xs" ta="center" mt="xl">
            &copy; 2024 Secure Systems Enterprise. Wszystkie połączenia są szyfrowane.
          </Text>
        </Container>
      </Center>
    </Box>
  );
}