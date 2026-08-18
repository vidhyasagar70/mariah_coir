import { dbQuery } from '../../../config/db.js';

// GET /api/sales/reports/summary
export async function getSalesReportSummary(req, res) {
  try {
    const { search, payment_status, product_id, date_from, date_to } = req.query;

    let baseQuery = `
      SELECT sd.*, p.product_name, p.category as product_category, p.unit as product_unit
      FROM sales_dispatches sd
      LEFT JOIN products p ON sd.product_id = p.id
      WHERE 1=1`;

    const params = [];

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      const pIdx = params.length;
      baseQuery += ` AND (sd.customer_name LIKE $${pIdx} OR sd.customer_phone LIKE $${pIdx} OR sd.vehicle_number LIKE $${pIdx} OR sd.id LIKE $${pIdx} OR p.product_name LIKE $${pIdx})`;
    }

    if (payment_status && payment_status !== 'ALL' && payment_status !== 'All') {
      params.push(payment_status);
      baseQuery += ` AND sd.payment_status = $${params.length}`;
    }

    if (product_id && product_id !== 'ALL' && product_id !== 'All') {
      params.push(product_id);
      baseQuery += ` AND sd.product_id = $${params.length}`;
    }

    if (date_from) {
      params.push(date_from);
      baseQuery += ` AND sd.order_date >= $${params.length}`;
    }

    if (date_to) {
      params.push(date_to);
      baseQuery += ` AND sd.order_date <= $${params.length}`;
    }

    baseQuery += ` ORDER BY sd.order_date DESC, sd.id DESC`;

    const dispatches = await dbQuery(baseQuery, params);

    // 1. Group by Customer
    const customerMap = {};
    dispatches.forEach(d => {
      const cName = d.customer_name;
      if (!customerMap[cName]) {
        customerMap[cName] = {
          customer_name: cName,
          customer_phone: d.customer_phone,
          dispatches_count: 0,
          total_units: 0,
          total_approx_weight: 0,
          total_actual_weight: 0,
          net_weight_difference: 0,
          total_revenue: 0,
          paid_revenue: 0,
          pending_revenue: 0
        };
      }
      const c = customerMap[cName];
      c.dispatches_count += 1;
      c.total_units += parseInt(d.quantity_units, 10) || 0;
      c.total_approx_weight += parseFloat(d.total_approx_weight) || 0;
      c.total_actual_weight += parseFloat(d.actual_scale_weight) || 0;
      c.net_weight_difference += parseFloat(d.weight_difference) || 0;
      
      const rev = parseFloat(d.total_sales_amount) || 0;
      c.total_revenue += rev;
      if (d.payment_status === 'Paid') {
        c.paid_revenue += rev;
      } else {
        c.pending_revenue += rev;
      }
    });

    const customerSummary = Object.values(customerMap);

    // 2. Group by Product
    const productMap = {};
    dispatches.forEach(d => {
      const pName = d.product_name || 'Unknown Product';
      if (!productMap[pName]) {
        productMap[pName] = {
          product_id: d.product_id,
          product_name: pName,
          category: d.product_category || 'N/A',
          unit: d.product_unit || 'Unit',
          dispatches_count: 0,
          total_units: 0,
          total_approx_weight: 0,
          total_actual_weight: 0,
          net_weight_difference: 0,
          total_revenue: 0
        };
      }
      const p = productMap[pName];
      p.dispatches_count += 1;
      p.total_units += parseInt(d.quantity_units, 10) || 0;
      p.total_approx_weight += parseFloat(d.total_approx_weight) || 0;
      p.total_actual_weight += parseFloat(d.actual_scale_weight) || 0;
      p.net_weight_difference += parseFloat(d.weight_difference) || 0;
      p.total_revenue += parseFloat(d.total_sales_amount) || 0;
    });

    const productSummary = Object.values(productMap);

    // 3. Global Analytics Summary
    const summary = {
      totalDispatches: dispatches.length,
      totalUnits: dispatches.reduce((acc, d) => acc + (parseInt(d.quantity_units, 10) || 0), 0),
      totalActualWeight: dispatches.reduce((acc, d) => acc + (parseFloat(d.actual_scale_weight) || 0), 0),
      totalApproxWeight: dispatches.reduce((acc, d) => acc + (parseFloat(d.total_approx_weight) || 0), 0),
      netWeightDifference: dispatches.reduce((acc, d) => acc + (parseFloat(d.weight_difference) || 0), 0),
      totalSalesRevenue: dispatches.reduce((acc, d) => acc + (parseFloat(d.total_sales_amount) || 0), 0),
      paidRevenue: dispatches.filter(d => d.payment_status === 'Paid').reduce((acc, d) => acc + (parseFloat(d.total_sales_amount) || 0), 0),
      pendingRevenue: dispatches.filter(d => d.payment_status !== 'Paid').reduce((acc, d) => acc + (parseFloat(d.total_sales_amount) || 0), 0)
    };

    res.json({
      dispatches,
      customerSummary,
      productSummary,
      summary
    });
  } catch (error) {
    console.error('Error generating sales report summary:', error);
    res.status(500).json({ error: error.message });
  }
}
