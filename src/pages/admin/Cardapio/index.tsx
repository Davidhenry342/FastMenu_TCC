import { useState } from 'react';
import { Search } from 'lucide-react';
import { AdminProductCard } from '../../../components/AdminProductCard';
import { Container } from '../../../components/Container';
import { DefaultButton } from '../../../components/DefaultButton';
import { ProductFormModal } from '../../../components/ProductFormModal';
import { useProducts } from '../../../contexts/ProductContext';
import { categories } from '../../../data/categories';
import type { Product } from '../../../models/product';
import styles from './styles.module.css';

export function Cardapio() {
  const { products, addProduct, updateProduct, deleteProduct } = useProducts();

  const [searchName, setSearchName] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  const normalizedSearch = searchName.trim().toLowerCase();

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(normalizedSearch),
  );

  const categoryNameOf = (product: Product) =>
    categories.find(category => category.id === product.categoryId)?.name;

  const handleCreate = (data: Omit<Product, 'id'>) => {
    addProduct({
      id: crypto.randomUUID(),
      ...data,
    });
    setIsCreateOpen(false);
  };

  const handleEdit = (data: Omit<Product, 'id'>) => {
    if (!editingProduct) {
      return;
    }

    updateProduct(editingProduct.id, data);
    setEditingProduct(null);
  };

  const handleConfirmDelete = () => {
    if (!deletingProduct) {
      return;
    }

    deleteProduct(deletingProduct.id);
    setDeletingProduct(null);
  };

  return (
    <>
      <Container>
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Cardápio</h2>

            <DefaultButton onClick={() => setIsCreateOpen(true)}>
              Novo produto
            </DefaultButton>
          </div>

          <div className={styles.searchBar}>
            <Search className={styles.searchIcon} />

            <input
              type="text"
              className={styles.searchInput}
              value={searchName}
              onChange={event => setSearchName(event.target.value)}
              placeholder="Buscar produto pelo nome..."
            />
          </div>

          {products.length === 0 ? (
            <p className={styles.emptyState}>Nenhum produto cadastrado.</p>
          ) : filteredProducts.length === 0 ? (
            <p className={styles.emptyState}>
              Nenhum produto encontrado para &quot;{searchName}&quot;.
            </p>
          ) : (
            <div className={styles.productGrid}>
              {filteredProducts.map(product => (
                <AdminProductCard
                  key={product.id}
                  product={product}
                  categoryName={categoryNameOf(product)}
                  onEdit={setEditingProduct}
                  onDelete={setDeletingProduct}
                />
              ))}
            </div>
          )}
        </section>
      </Container>

      {isCreateOpen && (
        <ProductFormModal
          title="Novo produto"
          onSubmit={handleCreate}
          onClose={() => setIsCreateOpen(false)}
        />
      )}

      {editingProduct && (
        <ProductFormModal
          title={`Editar ${editingProduct.name}`}
          initialProduct={editingProduct}
          onSubmit={handleEdit}
          onClose={() => setEditingProduct(null)}
        />
      )}

      {deletingProduct && (
        <div
          className={styles.confirmOverlay}
          onClick={() => setDeletingProduct(null)}
        >
          <div
            className={styles.confirmBox}
            role="dialog"
            aria-modal="true"
            onClick={event => event.stopPropagation()}
          >
            <p className={styles.confirmMessage}>
              Excluir o produto &quot;{deletingProduct.name}&quot;?
            </p>

            <div className={styles.confirmActions}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={() => setDeletingProduct(null)}
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