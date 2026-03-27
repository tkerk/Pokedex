const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const pushManager = {
  async init() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('[Push] Push notifications no soportadas');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('[Push] Permiso de notificaciones denegado');
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      
      // Verificar si ya hay una suscripción
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        // Crear nueva suscripción
        const publicKey = VAPID_PUBLIC_KEY;
        if (!publicKey) {
          console.error('[Push] VAPID public key no configurada');
          return false;
        }

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      // Enviar suscripción al backend
      const token = localStorage.getItem('poke_token');
      if (!token) return false;

      await fetch(`${API_URL}/push/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subscription }),
      });

      console.log('[Push] Suscripción registrada exitosamente');
      return true;
    } catch (error) {
      console.error('[Push] Error inicializando push:', error);
      return false;
    }
  },

  async unsubscribe() {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
      }

      const token = localStorage.getItem('poke_token');
      if (token) {
        await fetch(`${API_URL}/push/unsubscribe`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }

      console.log('[Push] Suscripción eliminada');
    } catch (error) {
      console.error('[Push] Error desuscribiendo:', error);
    }
  },

  // Escuchar mensajes del SW para mostrar notificaciones en foreground
  listenForMessages(callback) {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'PUSH_RECEIVED') {
          callback(event.data.payload);
        }
      });
    }
  },
};
