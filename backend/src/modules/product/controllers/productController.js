import { dbQuery, getNextId } from '../../../config/db.js';

// GET /api/products
export async function getProducts(req, res) {
  try {
    const { search, category, status } = req.query;

    let baseQuery = `SELECT * FROM products WHERE 1=1`;
    const params = [];

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      const pIdx = params.length;
      baseQuery += ` AND (product_name LIKE $${pIdx} OR id LIKE $${pIdx} OR category LIKE $${pIdx} OR unit LIKE $${pIdx})`;
    }

    if (category && category !== 'All') {
      params.push(category);
      baseQuery += ` AND category = $${params.length}`;
    }

    if (status && status !== 'All') {
      params.push(status);
      baseQuery += ` AND status = $${params.length}`;
    }

    baseQuery += ` ORDER BY created_at DESC, id DESC`;

    const products = await dbQuery(baseQuery, params);

    // Fetch total summary metrics across all products (unfiltered for KPI header)
    const allProducts = await dbQuery(`SELECT category, status FROM products`);

    const summary = {
      totalProducts: allProducts.length,
      activeProducts: allProducts.filter(p => p.status === 'Active').length,
      inactiveProducts: allProducts.filter(p => p.status === 'Inactive').length,
      categoriesCount: new Set(allProducts.map(p => p.category)).size
    };

    res.json({ products, summary });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: error.message });
  }
}

// GET /api/products/:id
export async function getProductById(req, res) {
  try {
    const { id } = req.params;
    const rows = await dbQuery(`SELECT * FROM products WHERE id = $1`, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: `Product with ID ${id} not found.` });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching product by ID:', error);
    res.status(500).json({ error: error.message });
  }
}

// POST /api/products
export async function createProduct(req, res) {
  try {
    const { product_name, category, unit, approx_bundle_weight, sell_price_per_kg, sell_price, status } = req.body;

    // Field Validations
    if (!product_name || !product_name.trim()) {
      return res.status(400).json({ error: 'Product name is required.' });
    }

    if (!category || !category.trim()) {
      return res.status(400).json({ error: 'Category is required.' });
    }

    const finalUnit = (unit && unit.trim()) ? unit.trim() : 'Bundle';

    const parsedWeight = parseFloat(approx_bundle_weight);
    if (isNaN(parsedWeight) || parsedWeight <= 0) {
      return res.status(400).json({ error: 'Approximate bundle weight must be a positive number.' });
    }

    const priceInput = sell_price_per_kg !== undefined ? sell_price_per_kg : sell_price;
    const parsedPricePerKg = parseFloat(priceInput);
    if (isNaN(parsedPricePerKg) || parsedPricePerKg < 0) {
      return res.status(400).json({ error: 'Selling price per kg must be a non-negative number.' });
    }

    const productStatus = status === 'Inactive' ? 'Inactive' : 'Active';

    // Generate product ID
    const newId = await getNextId('PRD');

    await dbQuery(
      `INSERT INTO products (id, product_name, category, unit, approx_bundle_weight, sell_price_per_kg, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        newId,
        product_name.trim(),
        category.trim(),
        finalUnit,
        parsedWeight,
        parsedPricePerKg,
        productStatus
      ]
    );

    const created = await dbQuery(`SELECT * FROM products WHERE id = $1`, [newId]);
    res.status(201).json(created[0]);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: error.message });
  }
}

// PUT /api/products/:id
export async function updateProduct(req, res) {
  try {
    const { id } = req.params;
    const { product_name, category, unit, approx_bundle_weight, sell_price_per_kg, sell_price, status } = req.body;

    const existing = await dbQuery(`SELECT * FROM products WHERE id = $1`, [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: `Product with ID ${id} not found.` });
    }

    if (!product_name || !product_name.trim()) {
      return res.status(400).json({ error: 'Product name is required.' });
    }

    if (!category || !category.trim()) {
      return res.status(400).json({ error: 'Category is required.' });
    }

    const finalUnit = (unit && unit.trim()) ? unit.trim() : 'Bundle';

    const parsedWeight = parseFloat(approx_bundle_weight);
    if (isNaN(parsedWeight) || parsedWeight <= 0) {
      return res.status(400).json({ error: 'Approximate bundle weight must be a positive number.' });
    }

    const priceInput = sell_price_per_kg !== undefined ? sell_price_per_kg : sell_price;
    const parsedPricePerKg = parseFloat(priceInput);
    if (isNaN(parsedPricePerKg) || parsedPricePerKg < 0) {
      return res.status(400).json({ error: 'Selling price per kg must be a non-negative number.' });
    }

    const productStatus = status === 'Inactive' ? 'Inactive' : 'Active';

    await dbQuery(
      `UPDATE products 
       SET product_name = $1, category = $2, unit = $3, approx_bundle_weight = $4, sell_price_per_kg = $5, status = $6
       WHERE id = $7`,
      [
        product_name.trim(),
        category.trim(),
        finalUnit,
        parsedWeight,
        parsedPricePerKg,
        productStatus,
        id
      ]
    );

    const updated = await dbQuery(`SELECT * FROM products WHERE id = $1`, [id]);
    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: error.message });
  }
}

// DELETE /api/products/:id
export async function deleteProduct(req, res) {
  try {
    const { id } = req.params;
    const existing = await dbQuery(`SELECT * FROM products WHERE id = $1`, [id]);

    if (existing.length === 0) {
      return res.status(404).json({ error: `Product with ID ${id} not found.` });
    }

    await dbQuery(`DELETE FROM products WHERE id = $1`, [id]);
    res.json({ success: true, message: `Product ${id} deleted successfully.` });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: error.message });
  }
}
