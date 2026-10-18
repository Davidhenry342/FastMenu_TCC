import { useRef, useState } from 'react';
import { Pencil, QrCode, Trash2 } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import jsPDF from 'jspdf';
import { Comanda } from '../../../components/Comanda';
import { Container } from '../../../components/Container';
import { DefaultButton } from '../../../components/DefaultButton';
import { TableFormModal } from '../../../components/TableFormModal';
import { useTables } from '../../../contexts/TableContext';
import type { Table } from '../../../models/table';
import styles from './styles.module.css';

export function Mesas() {
  const { tables, addTable, updateTable, deleteTable } = useTables();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [deletingTable, setDeletingTable] = useState<Table | null>(null);
  const [comandaTableNumber, setComandaTableNumber] = useState<number | null>(
    null,
  );
  const [qrTable, setQrTable] = useState<Table | null>(null);
  const qrCanvasRef = useRef<HTMLDivElement>(null);

  const sortedTables = [...tables].sort((a, b) => a.number - b.number);

  const takenNumbers = tables.map(table => table.number);
  const editTakenNumbers = editingTable
    ? tables
        .filter(table => table.id !== editingTable.id)
        .map(table => table.number)
    : [];

  const handleCreate = async (number: number) => {
    try {
      await addTable({ number });
      setIsCreateOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Falha ao criar mesa');
    }
  };

  const handleEdit = async (number: number) => {
    if (!editingTable) {
      return;
    }

    try {
      await updateTable(editingTable.id, { number });
      setEditingTable(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Falha ao atualizar mesa');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingTable) {
      return;
    }

    try {
      await deleteTable(deletingTable.id);
      setDeletingTable(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Falha ao excluir mesa');
    }
  };

  const handleDownloadPdf = () => {
    if (!qrTable) {
      return;
    }

    const canvas = qrCanvasRef.current?.querySelector('canvas') as HTMLCanvasElement | null;

    if (!canvas) {
      return;
    }

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    pdf.setFontSize(24);
    pdf.text(`Mesa ${qrTable.number}`, pageWidth / 2, 30, { align: 'center' });
    pdf.setFontSize(12);
    pdf.text('Escaneie para acessar o cardápio', pageWidth / 2, 40, { align: 'center' });

    const qrSize = 80;
    const x = (pageWidth - qrSize) / 2;
    const y = (pageHeight - qrSize) / 2;

    pdf.addImage(imgData, 'PNG', x, y, qrSize, qrSize);
    pdf.setFontSize(10);
    pdf.text(`${window.location.origin}/?mesa=${qrTable.number}`, pageWidth / 2, y + qrSize + 10, { align: 'center' });
    pdf.save(`mesa-${qrTable.number}-qrcode.pdf`);
  };

  return (
    <>
      <Container>
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Mesas</h2>

            <DefaultButton onClick={() => setIsCreateOpen(true)}>
              Nova mesa
            </DefaultButton>
          </div>

          <div className={styles.legend}>
            <span className={styles.legendItem}>
              <span className={`${styles.dot} ${styles.dotAvailable}`} />
              Disponível
            </span>

            <span className={styles.legendItem}>
              <span className={`${styles.dot} ${styles.dotOccupied}`} />
              Ocupada
            </span>
          </div>

          {sortedTables.length === 0 ? (
            <p className={styles.emptyState}>Nenhuma mesa cadastrada.</p>
          ) : (
            <div className={styles.tableGrid}>
              {sortedTables.map(table => (
                <div
                  key={table.id}
                  className={`${styles.tableCard} ${
                    table.status === 'Disponível'
                      ? styles.available
                      : styles.occupied
                  }`}
                  onClick={() => setComandaTableNumber(table.number)}
                  role="button"
                  tabIndex={0}
                >
                  <span className={styles.tableNumber}>{table.number}</span>

                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={styles.actionButton}
                      aria-label={`QR Code mesa ${table.number}`}
                      onClick={event => {
                        event.stopPropagation();
                        setQrTable(table);
                      }}
                    >
                      <QrCode />
                    </button>

                    <button
                      type="button"
                      className={styles.actionButton}
                      aria-label={`Editar mesa ${table.number}`}
                      onClick={event => {
                        event.stopPropagation();
                        setEditingTable(table);
                      }}
                    >
                      <Pencil />
                    </button>

                    <button
                      type="button"
                      className={styles.actionButton}
                      aria-label={`Excluir mesa ${table.number}`}
                      onClick={event => {
                        event.stopPropagation();
                        setDeletingTable(table);
                      }}
                    >
                      <Trash2 />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </Container>

      {isCreateOpen && (
        <TableFormModal
          title="Nova mesa"
          takenNumbers={takenNumbers}
          onSubmit={handleCreate}
          onClose={() => setIsCreateOpen(false)}
        />
      )}

      {editingTable && (
        <TableFormModal
          title={`Editar mesa ${editingTable.number}`}
          initialNumber={editingTable.number}
          takenNumbers={editTakenNumbers}
          onSubmit={handleEdit}
          onClose={() => setEditingTable(null)}
        />
      )}

      {deletingTable && (
        <div
          className={styles.confirmOverlay}
          onClick={() => setDeletingTable(null)}
        >
          <div
            className={styles.confirmBox}
            role="dialog"
            aria-modal="true"
            onClick={event => event.stopPropagation()}
          >
            <p className={styles.confirmMessage}>
              Excluir a mesa {deletingTable.number}?
            </p>

            <div className={styles.confirmActions}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={() => setDeletingTable(null)}
              >
                Cancelar
              </button>

              <button
                type="button"
                className={styles.deleteButton}
                onClick={handleConfirmDelete}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {qrTable && (
        <div className={styles.qrOverlay} onClick={() => setQrTable(null)}>
          <div
            className={styles.qrBox}
            role="dialog"
            aria-modal="true"
            onClick={event => event.stopPropagation()}
          >
            <h3>Mesa {qrTable.number}</h3>
            <p>Escaneie para acessar o cardápio</p>

            <div ref={qrCanvasRef} className={styles.qrCanvas}>
              <QRCodeCanvas
                value={`${window.location.origin}/?mesa=${qrTable.number}`}
                size={200}
                bgColor="#ffffff"
                fgColor="#000000"
                level="H"
              />
            </div>

            <p className={styles.qrUrl}>{`${window.location.origin}/?mesa=${qrTable.number}`}</p>

            <div className={styles.qrActions}>
              <button type="button" className={styles.cancelButton} onClick={() => setQrTable(null)}>
                Fechar
              </button>

              <button type="button" className={styles.confirmButton} onClick={handleDownloadPdf}>
                Baixar PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {comandaTableNumber !== null && (
        <Comanda
          tableNumber={comandaTableNumber}
          canDelete
          variant="employee"
          onClose={() => setComandaTableNumber(null)}
        />
      )}
    </>
  );
}