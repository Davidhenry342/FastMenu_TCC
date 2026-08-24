import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
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

  const sortedTables = [...tables].sort((a, b) => a.number - b.number);

  const toggleStatus = (table: Table) => {
    updateTable(table.id, {
      status: table.status === 'Disponível' ? 'Ocupada' : 'Disponível',
    });
  };

  const takenNumbers = tables.map(table => table.number);
  const editTakenNumbers = editingTable
    ? tables
        .filter(table => table.id !== editingTable.id)
        .map(table => table.number)
    : [];

  const handleCreate = (number: number) => {
    addTable({
      id: crypto.randomUUID(),
      number,
      status: 'Disponível',
    });
    setIsCreateOpen(false);
  };

  const handleEdit = (number: number) => {
    if (!editingTable) {
      return;
    }

    updateTable(editingTable.id, { number });
    setEditingTable(null);
  };

  const handleConfirmDelete = () => {
    if (!deletingTable) {
      return;
    }

    deleteTable(deletingTable.id);
    setDeletingTable(null);
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
                  onClick={() => toggleStatus(table)}
                  role="button"
                  tabIndex={0}
                >
                  <span className={styles.tableNumber}>{table.number}</span>

                  <div className={styles.actions}>
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
    </>
  );
}