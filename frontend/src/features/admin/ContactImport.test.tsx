import '@testing-library/jest-dom/vitest';
import {fireEvent, screen, within} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {apiClient, type ContactImportPreview} from '../../shared/api/client';
import {problemError} from '../../shared/api/errors';
import {renderPollTest, usePollTestLifecycle} from '../polls/pollTestSupport';
import {ContactImport, MAX_CONTACT_FILE_BYTES} from './ContactImport';

usePollTestLifecycle();

const preview: ContactImportPreview = {
    unreadableEntries: 0,
    contacts: [
        {position: 1, name: 'Anna Beispiel', email: 'anna@example.test', outcome: 'invite'},
        {position: 2, name: 'Bert Muster', email: 'bert@example.test', outcome: 'renew'},
        {position: 3, name: 'Clara', email: 'clara@example.test', outcome: 'invite'},
        {position: 4, name: 'Ohne Adresse', email: null, outcome: 'missing-email'},
        {position: 5, name: 'Konto', email: 'konto@example.test', outcome: 'has-account'},
    ],
};

function chooseFile(content = 'BEGIN:VCARD\nEND:VCARD\n', size?: number) {
    const file = new File([content], 'contacts.vcf', {type: 'text/vcard'});
    if (size !== undefined) Object.defineProperty(file, 'size', {value: size});
    fireEvent.change(screen.getByLabelText('Kontaktdatei (.vcf)'), {target: {files: [file]}});
}

describe('ContactImport', () => {
    it('previews the file without sending and invites the selected contacts', async () => {
        const read = vi.spyOn(apiClient, 'previewContactImport').mockResolvedValue(preview);
        const send = vi.spyOn(apiClient, 'importContacts').mockResolvedValue({
            invited: 2, renewed: 1, deliveryFailed: 1,
            entries: [
                {email: 'anna@example.test', outcome: 'invited'},
                {email: 'bert@example.test', outcome: 'renewed'},
                {email: 'clara@example.test', outcome: 'delivery-failed'},
            ],
        });
        renderPollTest('/admin/invitations', <ContactImport/>);

        chooseFile('BEGIN:VCARD\nFN:Anna\nEND:VCARD\n');

        const rows = await screen.findAllByRole('row');
        expect(rows).toHaveLength(6);
        expect(read).toHaveBeenCalledWith('BEGIN:VCARD\nFN:Anna\nEND:VCARD\n');
        expect(within(rows[2]).getByText('Einladung wird erneuert')).toBeVisible();
        expect(within(rows[4]).getByText('Keine E-Mail-Adresse')).toBeVisible();
        expect(within(rows[4]).queryByRole('checkbox')).toBeNull();
        expect(within(rows[5]).getByText('Hat bereits ein Konto')).toBeVisible();
        expect(send).not.toHaveBeenCalled();

        fireEvent.change(screen.getByLabelText('Sprache der Einladung'), {target: {value: 'en'}});
        fireEvent.click(screen.getByRole('button', {name: '3 einladen'}));

        expect(await screen.findByText('2 eingeladen, 1 erneuert, 0 übersprungen.')).toBeVisible();
        expect(screen.getByText(/1 E-Mails konnten nicht zugestellt werden/)).toBeVisible();
        expect(send).toHaveBeenCalledWith({
            locale: 'en',
            contacts: [
                {email: 'anna@example.test', name: 'Anna Beispiel'},
                {email: 'bert@example.test', name: 'Bert Muster'},
                {email: 'clara@example.test', name: 'Clara'},
            ],
        });
    });

    it('lets the administrator deselect contacts and requires at least one', async () => {
        vi.spyOn(apiClient, 'previewContactImport').mockResolvedValue(preview);
        const send = vi.spyOn(apiClient, 'importContacts').mockResolvedValue({
            invited: 1, renewed: 0, deliveryFailed: 0, entries: [{email: 'clara@example.test', outcome: 'invited'}],
        });
        renderPollTest('/admin/invitations', <ContactImport/>);
        chooseFile();

        fireEvent.click(await screen.findByRole('checkbox', {name: 'Anna Beispiel einladen'}));
        fireEvent.click(screen.getByRole('checkbox', {name: 'Bert Muster einladen'}));
        fireEvent.click(screen.getByRole('button', {name: '1 einladen'}));
        await screen.findByText('1 eingeladen, 0 erneuert, 0 übersprungen.');
        expect(send.mock.calls[0][0].contacts).toEqual([{email: 'clara@example.test', name: 'Clara'}]);

        fireEvent.click(screen.getByRole('button', {name: 'Weitere Datei wählen'}));
        chooseFile();
        const selectAll = await screen.findByRole('checkbox', {name: 'Alle einladbaren Kontakte auswählen'});
        expect(selectAll).toBeChecked();
        fireEvent.click(selectAll);
        const none = screen.getByRole('button', {name: '0 einladen'});
        expect(none).toBeEnabled();
        fireEvent.click(none);
        expect(screen.getByRole('alert')).toHaveTextContent('Wähle mindestens einen Kontakt aus.');
        fireEvent.click(selectAll);
        expect(screen.getByRole('button', {name: '3 einladen'})).toBeEnabled();
    });

    it('cancels without sending', async () => {
        vi.spyOn(apiClient, 'previewContactImport').mockResolvedValue(preview);
        const send = vi.spyOn(apiClient, 'importContacts');
        renderPollTest('/admin/invitations', <ContactImport/>);
        chooseFile();

        fireEvent.click(await screen.findByRole('button', {name: 'Abbrechen'}));

        expect(screen.getByLabelText('Kontaktdatei (.vcf)')).toBeVisible();
        expect(send).not.toHaveBeenCalled();
    });

    it('lists skipped contacts with their reason', async () => {
        vi.spyOn(apiClient, 'previewContactImport').mockResolvedValue(preview);
        vi.spyOn(apiClient, 'importContacts').mockResolvedValue({
            invited: 0, renewed: 0, deliveryFailed: 0,
            entries: [{email: 'anna@example.test', outcome: 'skipped', reason: 'already-invited'}],
        });
        renderPollTest('/admin/invitations', <ContactImport/>);
        chooseFile();
        fireEvent.click(await screen.findByRole('button', {name: '3 einladen'}));

        expect(await screen.findByText('0 eingeladen, 0 erneuert, 1 übersprungen.')).toBeVisible();
        expect(screen.getByRole('listitem')).toHaveTextContent('anna@example.test – Bereits eingeladen');
    });

    it('explains unreadable entries, oversized files and server rejections', async () => {
        const read = vi.spyOn(apiClient, 'previewContactImport').mockResolvedValue({...preview, unreadableEntries: 2});
        renderPollTest('/admin/invitations', <ContactImport/>);

        chooseFile();
        expect(await screen.findByText('2 Einträge der Datei konnten nicht gelesen werden.')).toBeVisible();

        fireEvent.click(screen.getByRole('button', {name: 'Abbrechen'}));
        chooseFile('x', MAX_CONTACT_FILE_BYTES + 1);
        expect(await screen.findByRole('alert')).toHaveTextContent('größer als 1 MB');
        expect(read).toHaveBeenCalledTimes(1);

        read.mockRejectedValueOnce(problemError({code: 'contact-import-invalid'}, 400));
        chooseFile('Hallo');
        expect(await screen.findByText(/keine lesbaren Kontakte/)).toBeVisible();

        read.mockRejectedValueOnce(problemError({code: 'invitation-delivery-unavailable'}, 409));
        chooseFile();
        expect(await screen.findByText(/kein Mailversand eingerichtet/)).toBeVisible();
    });

    it('locks the import once mail delivery turns out to be unavailable', async () => {
        const read = vi.spyOn(apiClient, 'previewContactImport').mockResolvedValue(preview);
        vi.spyOn(apiClient, 'importContacts').mockRejectedValue(problemError({code: 'invitation-delivery-unavailable'}, 409));
        renderPollTest('/admin/invitations', <ContactImport/>);
        chooseFile();
        fireEvent.click(await screen.findByRole('button', {name: '3 einladen'}));

        expect(await screen.findByText(/kein Mailversand eingerichtet/)).toBeVisible();
        expect(screen.getByLabelText('Kontaktdatei (.vcf)')).toBeDisabled();
        expect(screen.queryByRole('button', {name: '3 einladen'})).toBeNull();
        expect(read).toHaveBeenCalledTimes(1);
    });
});
