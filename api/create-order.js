const Razorpay = require('razorpay')

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { amount, currency = 'INR', notes = {}, receipt } = req.body

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' })
  }

  try {
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })

    const order = await razorpay.orders.create({
      amount,
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
      notes: notes || {},
    })

    res.status(200).json(order)
  } catch (err) {
    console.error('Razorpay order creation failed:', err)
    res.status(500).json({ error: 'Failed to create order' })
  }
}
