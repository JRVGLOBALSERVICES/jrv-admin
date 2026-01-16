import { Metadata } from 'next';
import ManualClient from './ManualClient';

export const metadata: Metadata = {
    title: 'JRV Admin Manual - Complete Guide | JRV Global Services',
    description: 'Complete interactive guide to the JRV Global Services Admin Dashboard and its direct integration with the live customer website at jrvservices.co',
    keywords: ['JRV Admin', 'Admin Manual', 'JRV Global Services', 'Car Rental Admin', 'Dashboard Guide'],
    openGraph: {
        title: 'JRV Admin Manual - Complete Guide',
        description: 'Interactive admin manual for JRV Global Services',
        type: 'website',
    },
};

export default function ManualPage() {
    return <ManualClient />;
}
