import { useRef, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import jsQR from 'jsqr';
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
  Alert,
  Loader,
} from '@mantine/core';
import { 
  IconArrowLeft, 
  IconShieldLock, 
  IconAlertCircle,
  IconCheck,
  IconX,
} from '@tabler/icons-react';

type VerifyStep = 'qr-scanning' | 'face-capture' | 'processing' | 'success' | 'error';

export default function VerifyPage() {
  const navigate = useNavigate();
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [step, setStep] = useState<VerifyStep>('qr-scanning');
  const [employeeData, setEmployeeData] = useState<{
    id: string;
    name: string;
    photo_ref: string;
  } | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('Skanuję kod QR...');
  const [qrScanned, setQrScanned] = useState(false);
  const [faceCheckCount, setFaceCheckCount] = useState(0);

  // Skanowanie QR z video stream
  const scanQRFromCamera = useCallback(() => {
    if (!webcamRef.current || !canvasRef.current || qrScanned) return;

    try {
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) return;

      // Dekodowanie base64 na obraz
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.onload = async () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const qrData = jsQR(imageData.data, canvas.width, canvas.height);

        if (qrData && qrData.data && !qrScanned) {
          // QR znaleziony!
          setQrScanned(true);
          setMessage('Znaleziono kod QR, weryfikuję...');
          
          // Wysłanie do backendu
          try {
            const apiUrl = `http://${window.location.hostname}:5000/api/verify/qr`;
            const response = await fetch(apiUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                qr_code: qrData.data,
              }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
              setEmployeeData({
                id: data.employee_id,
                name: data.employee_name,
                photo_ref: data.photo_ref,
              });
              setStep('face-capture');
              setMessage('Kod QR poprawny! Teraz weryfikuję twarz...');
              setFaceCheckCount(0);
            } else {
              throw new Error(data.message || 'Kod QR nie znaleziony');
            }
          } catch (err) {
            setError((err instanceof Error ? err.message : 'Błąd weryfikacji QR'));
            setStep('error');
          }
        }
      };
      img.src = imageSrc;
    } catch (err) {
      console.error('QR Scan error:', err);
    }
  }, [qrScanned]);

  // Automatyczne skanowanie QR co 500ms
  useEffect(() => {
    if (step === 'qr-scanning' && !qrScanned) {
      const interval = setInterval(scanQRFromCamera, 500);
      return () => clearInterval(interval);
    }
  }, [step, scanQRFromCamera, qrScanned]);

  // Weryfikacja twarzy co 1.5 sekundy
  const verifyFace = useCallback(async () => {
    if (!webcamRef.current || !employeeData || step !== 'face-capture') return;

    try {
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) return;

      setFaceCheckCount(prev => prev + 1);

      const apiUrl = `http://${window.location.hostname}:5000/api/verify/face`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_base64: imageSrc,
          employee_id: employeeData.id,
          employee_name: employeeData.name,
          photo_ref: employeeData.photo_ref,
        }),
      });

      const data = await response.json();

      if (response.ok && data.access === 'GRANTED') {
        setStep('success');
        setMessage(data.message || 'Dostęp przyznany!');
        
        // Auto redirect po 3 sekundach
        setTimeout(() => {
          navigate('/');
        }, 3000);
      } else if (!response.ok && data.access === 'DENIED') {
        setStep('error');
        setMessage(data.message || 'Dostęp odmówiony!');
      }
    } catch (err) {
      console.error('Face verification error:', err);
    }
  }, [employeeData, step, navigate]);

  // Automatyczna weryfikacja twarzy
  useEffect(() => {
    if (step === 'face-capture' && faceCheckCount < 10) {
      const interval = setInterval(() => {
        verifyFace();
      }, 1500);
      return () => clearInterval(interval);
    } else if (step === 'face-capture' && faceCheckCount >= 10) {
      // Timeout - twarz nie rozpoznana w ciągu ~15 sekund
      setStep('error');
      setMessage('Nie rozpoznano twarzy w wyznaczonym czasie! Dostęp odmówiony.');
    }
  }, [step, faceCheckCount, verifyFace]);

  const handleGoHome = () => {
    navigate('/');
  };

  const handleReset = () => {
    setStep('qr-scanning');
    setError('');
    setMessage('Skanuję kod QR...');
    setEmployeeData(null);
    setQrScanned(false);
    setFaceCheckCount(0);
  };

  return (
    // Główny kontener
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

      {/* GŁÓWNA ZAWARTOŚĆ */}
      <Center style={{ flex: 1, padding: '20px' }}>
        <Container size={500} my={40}>

          {/* SKANOWANIE QR */}
          {step === 'qr-scanning' && (
            <Paper withBorder shadow="md" p={40} radius="md">
              <Title ta="center" fw={700} mb="lg">
                Weryfikacja tożsamości
              </Title>
              
              <div style={{ 
                width: '100%', 
                maxWidth: '400px', 
                margin: '0 auto',
                marginBottom: '20px',
                border: '3px dashed #4dabf7',
                borderRadius: '8px',
                overflow: 'hidden',
                backgroundColor: '#000'
              }}>
                <Webcam
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{ width: 400, height: 400, facingMode: 'user' }}
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                />
              </div>

              <Text c="dimmed" size="sm" ta="center" mb={20}>
                {message}
              </Text>

              <Group gap="sm" mb={20}>
                <Loader size="sm" />
                <Text c="dimmed" size="sm">
                  Czekam na kod QR...
                </Text>
              </Group>

              <Stack gap="sm">
                <Button
                  fullWidth
                  radius="md"
                  color="gray"
                  variant="light"
                  leftSection={<IconArrowLeft size={16} />}
                  onClick={handleGoHome}
                >
                  Anuluj
                </Button>
                
                <Button
                  fullWidth
                  radius="md"
                  color="cyan"
                  size="xs"
                  variant="subtle"
                  onClick={() => {
                    // Fallback do testowania - WB_qr to kod z bazy
                    setQrScanned(true);
                    setMessage('Znaleziono kod QR, weryfikuję...');
                    fetch(`http://${window.location.hostname}:5000/api/verify/qr`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ qr_code: 'WB_qr' })
                    })
                      .then(r => r.json())
                      .then(data => {
                        if (data.success) {
                          setEmployeeData({
                            id: data.employee_id,
                            name: data.employee_name,
                            photo_ref: data.photo_ref,
                          });
                          setStep('face-capture');
                          setMessage('Kod QR poprawny! Teraz weryfikuję twarz...');
                        } else {
                          setError(data.message);
                          setStep('error');
                        }
                      });
                  }}
                >
                  Test (WB_qr)
                </Button>
              </Stack>
            </Paper>
          )}

          {/* WERYFIKACJA TWARZY */}
          {step === 'face-capture' && employeeData && (
            <Paper withBorder shadow="md" p={40} radius="md">
              <Title ta="center" fw={700} mb="lg">
                Weryfikacja twarzy
              </Title>
              
              <Text c="dimmed" size="sm" ta="center" mb={20} fw={600}>
                Pracownik: <Text component="span" fw={700} c="blue">{employeeData.name}</Text>
              </Text>

              <div style={{ 
                width: '100%', 
                maxWidth: '400px', 
                margin: '0 auto',
                marginBottom: '20px',
                border: '3px dashed #ffd43b',
                borderRadius: '8px',
                overflow: 'hidden',
                backgroundColor: '#000'
              }}>
                <Webcam
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{ width: 400, height: 400, facingMode: 'user' }}
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                />
              </div>

              <Group gap="sm" mb={20}>
                <Loader size="sm" />
                <Text c="dimmed" size="sm">
                  {message}
                </Text>
              </Group>

              <Button
                fullWidth
                radius="md"
                color="gray"
                variant="light"
                onClick={handleReset}
              >
                Anuluj
              </Button>
            </Paper>
          )}

          {/* PRZETWARZANIE */}
          {step === 'processing' && (
            <Paper withBorder shadow="md" p={40} radius="md">
              <Title ta="center" fw={700} mb="lg">
                Przetwarzanie...
              </Title>
              <Center mb={30}>
                <Loader size="lg" color="blue" />
              </Center>
              <Text c="dimmed" size="sm" ta="center">
                {message}
              </Text>
            </Paper>
          )}

          {/* SUKCES */}
          {step === 'success' && (
            <Paper withBorder shadow="md" p={40} radius="md">
              <Center mb={20}>
                <IconCheck size={48} color="green" />
              </Center>
              <Title ta="center" fw={700} mb="lg" c="green">
                Dostęp przyznany!
              </Title>
              <Text ta="center" mb={30}>
                {message}
              </Text>

              <Stack gap="sm">
                <Button
                  fullWidth
                  radius="md"
                  color="green"
                  onClick={handleGoHome}
                  disabled
                >
                  Powrót za 3 sekundy...
                </Button>
              </Stack>
            </Paper>
          )}

          {/* BŁĄD */}
          {step === 'error' && (
            <Paper withBorder shadow="md" p={40} radius="md">
              <Center mb={20}>
                <IconX size={48} color="red" />
              </Center>
              <Title ta="center" fw={700} mb="lg" c="red">
                Błąd weryfikacji
              </Title>
              
              {error && (
                <Alert icon={<IconAlertCircle size={16} />} color="red" mb="lg" variant="light">
                  {error}
                </Alert>
              )}

              <Text ta="center" mb={30} c="dimmed">
                {message}
              </Text>

              <Stack gap="sm">
                <Button
                  fullWidth
                  radius="md"
                  color="blue"
                  onClick={handleReset}
                >
                  Spróbuj ponownie
                </Button>
                <Button
                  fullWidth
                  radius="md"
                  variant="light"
                  onClick={handleGoHome}
                >
                  Powrót do strony głównej
                </Button>
              </Stack>
            </Paper>
          )}

          {/* Canvas do skanowania QR - niewidoczny */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          <Text c="dimmed" size="xs" ta="center" mt="xl">
            &copy; 2024 Secure Systems Enterprise. Wszystkie połączenia są szyfrowane.
          </Text>
        </Container>
      </Center>
    </Box>
  );
}
