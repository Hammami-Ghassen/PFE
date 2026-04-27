import React, { useEffect, useMemo, useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import Alert from '../ui/Alert';
import { formatDate } from '../../utils/helpers';

const WEEK_DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const toDayMonth = (date) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
};

const normalizeHolidayDayMonth = (value) => {
  if (!value || typeof value !== 'string') return null;
  const normalized = value.trim();
  return /^\d{2}\/\d{2}$/.test(normalized) ? normalized : null;
};

const parseAsLocalDay = (value) => {
  if (!value || typeof value !== 'string') return null;

  const trimmed = value.trim();
  const isoDayMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDayMatch) {
    const year = Number.parseInt(isoDayMatch[1], 10);
    const month = Number.parseInt(isoDayMatch[2], 10);
    const day = Number.parseInt(isoDayMatch[3], 10);
    const localDate = new Date(year, month - 1, day);
    return Number.isNaN(localDate.getTime()) ? null : localDate;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
};

const buildMonthBlocks = (startDate, endDate) => {
  if (!startDate || !endDate) return [];

  const firstMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const lastMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
  const blocks = [];

  for (let cursor = new Date(firstMonth); cursor <= lastMonth && blocks.length < 12; cursor.setMonth(cursor.getMonth() + 1)) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);

    const firstWeekDay = (monthStart.getDay() + 6) % 7;
    const cells = [];

    for (let i = 0; i < firstWeekDay; i += 1) {
      cells.push(null);
    }

    for (let day = 1; day <= monthEnd.getDate(); day += 1) {
      cells.push(new Date(year, month, day));
    }

    blocks.push({
      key: `${year}-${month}`,
      label: new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(monthStart),
      cells,
    });
  }

  return blocks;
};

const LeaveValidationDetailModal = ({
  isOpen,
  onClose,
  request,
  holidays,
  balance,
  loadingBalance,
  submitting,
  onApprove,
  onReject,
}) => {
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (isOpen) {
      setComment('');
    }
  }, [isOpen, request?.codSoc, request?.matPers, request?.numDcng]);

  const startDate = useMemo(() => {
    return parseAsLocalDay(request?.dateDebut);
  }, [request?.dateDebut]);

  const endDate = useMemo(() => {
    return parseAsLocalDay(request?.dateFin);
  }, [request?.dateFin]);

  const holidayDayMonthSet = useMemo(() => {
    const result = new Set();
    (holidays || []).forEach((holiday) => {
      const normalized = normalizeHolidayDayMonth(holiday?.datFerier);
      if (normalized) {
        result.add(normalized);
      }
    });
    return result;
  }, [holidays]);

  const monthBlocks = useMemo(() => buildMonthBlocks(startDate, endDate), [startDate, endDate]);

  const isPending = request?.statusCode === 'I';

  const renderCalendarDay = (date) => {
    if (!date) {
      return <div className="h-10 rounded-md bg-transparent" />;
    }

    const inRange = startDate && endDate && date >= startDate && date <= endDate;
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = holidayDayMonthSet.has(toDayMonth(date));

    const classes = [
      'h-10 rounded-md border text-xs flex items-center justify-center font-medium',
      'transition-colors',
    ];

    if (inRange) {
      classes.push('bg-blue-100 border-blue-300 text-blue-800');
    } else {
      classes.push('bg-white border-gray-200 text-gray-700');
    }

    if (isWeekend) {
      classes.push('text-gray-400 bg-gray-50');
    }

    if (isHoliday) {
      classes.push('ring-1 ring-red-300 text-red-700');
    }

    return <div className={classes.join(' ')}>{date.getDate()}</div>;
  };

  const balanceValue = (() => {
    const parsed = Number.parseFloat(balance?.currentBalance ?? 0);
    if (Number.isNaN(parsed)) return '0';
    return Number.isInteger(parsed) ? String(parsed) : parsed.toFixed(3);
  })();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Détails de la demande de congé"
      maxWidthClass="max-w-6xl"
      bodyClassName="max-h-[75vh] overflow-y-auto"
      footer={(
        isPending ? (
          <>
            <Button variant="secondary" onClick={onClose} disabled={submitting}>
              Fermer
            </Button>
            <Button
              variant="danger"
              onClick={() => onReject(comment)}
              loading={submitting}
              disabled={submitting}
            >
              Refuser
            </Button>
            <Button
              onClick={() => onApprove(comment)}
              loading={submitting}
              disabled={submitting}
            >
              Accepter
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Fermer
          </Button>
        )
      )}
    >
      {!request ? (
        <div className="py-8 text-center text-gray-500">Aucune demande sélectionnée.</div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Agent</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">{request.fullName || '—'}</p>
                <p className="text-xs text-gray-600">MAT_PERS: {request.matPers}</p>
                <p className="text-xs text-gray-600">Rôle: {request.demandeurRole || '—'}</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Demande</p>
                <p className="mt-1 text-sm text-gray-700">Du {formatDate(request.dateDebut)} au {formatDate(request.dateFin)}</p>
                <p className="text-xs text-gray-600">Motif: {request.libMot || request.codeM || '—'}</p>
                <p className="text-xs text-gray-600">Durée: {request.nbrJours ?? '—'} jour(s)</p>
                <p className="text-xs text-gray-600">Statut: {request.statusLabel || request.statusCode || '—'}</p>
              </div>
              <div className="md:col-span-2 border border-gray-200 rounded-lg p-4 bg-white">
                <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Commentaire de la demande</p>
                <p className="mt-1 text-sm text-gray-700">{request.requestComment || 'Aucun commentaire fourni.'}</p>
              </div>
              {request.statusCode === 'N' && request.rejectionComment && (
                <div className="md:col-span-2">
                  <Alert type="warning" message={`Motif de refus: ${request.rejectionComment}`} />
                </div>
              )}
            </div>

            <div className="border border-gray-200 rounded-lg p-4 bg-blue-50">
              <p className="text-xs uppercase tracking-wider text-blue-700 font-semibold">Solde actuel demandeur</p>
              {loadingBalance ? (
                <div className="py-4 flex justify-center">
                  <Spinner size="sm" />
                </div>
              ) : (
                <>
                  <p className="mt-2 text-4xl font-extrabold text-blue-700 leading-none">{balanceValue}</p>
                  <p className="mt-2 text-xs text-blue-800">jours ouvrables disponibles</p>
                </>
              )}
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-4 bg-white">
            <h4 className="text-sm font-semibold text-gray-800 mb-3">Calendrier de la demande</h4>

            {monthBlocks.length === 0 ? (
              <p className="text-sm text-gray-500">Impossible d'afficher le calendrier.</p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {monthBlocks.map((month) => (
                    <div key={month.key} className="border border-gray-200 rounded-lg p-3">
                      <p className="text-sm font-semibold text-gray-800 capitalize mb-2">{month.label}</p>
                      <div className="grid grid-cols-7 gap-1 mb-1">
                        {WEEK_DAYS.map((day) => (
                          <div key={day} className="text-[10px] font-semibold text-gray-500 uppercase text-center py-1">
                            {day}
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {month.cells.map((date, index) => (
                          <div key={`${month.key}-${index}`}>
                            {renderCalendarDay(date)}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                  <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded bg-blue-100 border border-blue-300" />Plage demandée</span>
                  <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded bg-gray-50 border border-gray-200" />Week-end</span>
                  <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded bg-white border border-red-300" />Jour férié</span>
                </div>
              </div>
            )}
          </div>

          {isPending && (
            <div>
              <label htmlFor="review-comment" className="block text-sm font-medium text-gray-700 mb-1">
                Commentaire / raison de refus (optionnel)
              </label>
              <textarea
                id="review-comment"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                maxLength={1000}
                rows={4}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ministere-500 focus:border-ministere-500"
                placeholder="Ajoutez un commentaire pour la décision"
              />
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default LeaveValidationDetailModal;
