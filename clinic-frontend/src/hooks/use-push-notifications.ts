'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { actionsApi } from '@/lib/api/actions';
import { PUSH_OPT_OUT_KEY } from '@/lib/constants';

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray.buffer as ArrayBuffer;
}

function getBrowserName(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome') && !ua.includes('Edg')) return 'chrome';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'safari';
    if (ua.includes('Firefox')) return 'firefox';
    if (ua.includes('Edg')) return 'edge';
    return 'unknown';
}

export type PushPermission = 'default' | 'granted' | 'denied' | 'unsupported';

export function usePushNotifications() {
    const [permission, setPermission] = useState<PushPermission>('default');
    const [isOptedOut, setIsOptedOut] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const vapidKeyRef = useRef<string | null>(null);

    // Fetch VAPID key from backend on mount
    useEffect(() => {
        if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
            setPermission('unsupported');
            return;
        }
        setPermission(Notification.permission as PushPermission);
        setIsOptedOut(localStorage.getItem(PUSH_OPT_OUT_KEY) === 'true');

        // Fetch VAPID key from backend
        actionsApi.getVapidPublicKey().then((key) => {
            vapidKeyRef.current = key || null;
        }).catch(() => {
            console.warn('Push notifications disabled: missing VAPID key from backend');
        });
    }, []);

    const subscribe = useCallback(async () => {
        setIsLoading(true);
        try {
            const result = await Notification.requestPermission();
            setPermission(result as PushPermission);

            if (result !== 'granted') {
                return;
            }

            // Fetch key if not already loaded
            if (!vapidKeyRef.current) {
                vapidKeyRef.current = (await actionsApi.getVapidPublicKey()) || null;
            }

            if (!vapidKeyRef.current) {
                console.error('VAPID_PUBLIC_KEY not configured on backend. Cannot subscribe.');
                return;
            }

            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidKeyRef.current),
            });

            const subJson = subscription.toJSON();
            await actionsApi.subscribePush({
                endpoint: subJson.endpoint!,
                keys: {
                    p256dh: subJson.keys!.p256dh,
                    auth: subJson.keys!.auth,
                },
                browser: getBrowserName(),
            });

            localStorage.removeItem(PUSH_OPT_OUT_KEY);
            setIsOptedOut(false);
        } catch (err) {
            console.error('Push subscription failed:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const unsubscribe = useCallback(async () => {
        setIsLoading(true);
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) {
                await actionsApi.unsubscribePush(subscription.endpoint);
                await subscription.unsubscribe();
            }
            localStorage.setItem(PUSH_OPT_OUT_KEY, 'true');
            setIsOptedOut(true);
        } catch (err) {
            console.error('Push unsubscribe failed:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Effective "enabled" state: permission granted AND not opted out
    const isEnabled = permission === 'granted' && !isOptedOut;

    return {
        permission,
        isEnabled,
        isLoading,
        subscribe,
        unsubscribe,
        isSupported: permission !== 'unsupported',
    };
}
