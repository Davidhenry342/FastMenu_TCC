import { useState } from 'react';
import { Pencil, Search, Trash2 } from 'lucide-react';
import { Container } from '../../../components/Container';
import { DefaultButton } from '../../../components/DefaultButton';
import { EmployeeFormModal } from '../../../components/EmployeeFormModal';
import { useEmployees } from '../../../contexts/EmployeeContext';
import type { Employee } from '../../../models/employee';
import styles from './styles.module.css';

export function Funcionarios() {
  const { employees, addEmployee, updateEmployee, deleteEmployee } =
    useEmployees();

  const [searchName, setSearchName] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(
    null,
  );

  const normalizedSearch = searchName.trim().toLowerCase();

  const filteredEmployees = employees.filter(employee =>
    employee.name.toLowerCase().includes(normalizedSearch),
  );

  const takenCpfs = employees.map(employee => employee.cpf);
  const takenEmails = employees.map(employee => employee.email);
  const editTakenCpfs = editingEmployee
    ? employees
        .filter(employee => employee.id !== editingEmployee.id)
        .map(employee => employee.cpf)
    : [];
  const editTakenEmails = editingEmployee
    ? employees
        .filter(employee => employee.id !== editingEmployee.id)
        .map(employee => employee.email)
    : [];

  const handleCreate = (data: Omit<Employee, 'id'>) => {
    addEmployee({
      id: crypto.randomUUID(),
      ...data,
    });
    setIsCreateOpen(false);
  };

  const handleEdit = (data: Omit<Employee, 'id'>) => {
    if (!editingEmployee) {
      return;
    }

    updateEmployee(editingEmployee.id, data);
    setEditingEmployee(null);
  };

  const handleConfirmDelete = () => {
    if (!deletingEmployee) {
      return;
    }

    deleteEmployee(deletingEmployee.id);
    setDeletingEmployee(null);
  };

  return (
    <>
      <Container>
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Funcionários</h2>

            <DefaultButton onClick={() => setIsCreateOpen(true)}>
              Novo funcionário
            </DefaultButton>
          </div>

          <div className={styles.searchBar}>
            <Search className={styles.searchIcon} />

            <input
              type="text"
              className={styles.searchInput}
              value={searchName}
              onChange={event => setSearchName(event.target.value)}
              placeholder="Buscar funcionário pelo nome..."
            />
          </div>

          {employees.length === 0 ? (
            <p className={styles.emptyState}>Nenhum funcionário cadastrado.</p>
          ) : filteredEmployees.length === 0 ? (
            <p className={styles.emptyState}>
              Nenhum funcionário encontrado para &quot;{searchName}&quot;.
            </p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>CPF</th>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Telefone</th>
                  <th>Endereço</th>
                  <th>Cargo</th>
                  <th className={styles.actionsColumn}>Ações</th>
                </tr>
              </thead>

              <tbody>
                {filteredEmployees.map(employee => (
                  <tr key={employee.id} className={styles.row}>
                    <td>{employee.cpf}</td>
                    <td>{employee.name}</td>
                    <td>{employee.email}</td>
                    <td>{employee.phone}</td>
                    <td>{employee.address}</td>
                    <td>
                      <span className={styles.roleBadge}>{employee.role}</span>
                    </td>
                    <td className={styles.actionsCell}>
                      <button
                        type="button"
                        className={styles.actionButton}
                        aria-label={`Editar ${employee.name}`}
                        onClick={() => setEditingEmployee(employee)}
                      >
                        <Pencil />
                      </button>

                      <button
                        type="button"
                        className={`${styles.actionButton} ${styles.deleteActionButton}`}
                        aria-label={`Excluir ${employee.name}`}
                        onClick={() => setDeletingEmployee(employee)}
                      >
                        <Trash2 />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </Container>

      {isCreateOpen && (
        <EmployeeFormModal
          title="Novo funcionário"
          takenCpfs={takenCpfs}
          takenEmails={takenEmails}
          onSubmit={handleCreate}
          onClose={() => setIsCreateOpen(false)}
        />
      )}

      {editingEmployee && (
        <EmployeeFormModal
          title={`Editar ${editingEmployee.name}`}
          initialEmployee={editingEmployee}
          takenCpfs={editTakenCpfs}
          takenEmails={editTakenEmails}
          onSubmit={handleEdit}
          onClose={() => setEditingEmployee(null)}
        />
      )}

      {deletingEmployee && (
        <div
          className={styles.confirmOverlay}
          onClick={() => setDeletingEmployee(null)}
        >
          <div
            className={styles.confirmBox}
            role="dialog"
            aria-modal="true"
            onClick={event => event.stopPropagation()}
          >
            <p className={styles.confirmMessage}>
              Excluir o funcionário {deletingEmployee.name}?
            </p>

            <div className={styles.confirmActions}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={() => setDeletingEmployee(null)}
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