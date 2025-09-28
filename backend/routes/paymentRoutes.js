const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const { authenticate } = require('../middleware/auth');
const { Project, User } = require('../models');

// Initialize Stripe
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * @route   POST /api/payments/create-payment-intent
 * @desc    Create a payment intent for project payment
 * @access  Private
 */
router.post('/create-payment-intent', authenticate, async (req, res) => {
  try {
    const { projectId, amount, currency = 'inr' } = req.body;

    if (!projectId || !amount) {
      return res.status(400).json({
        error: 'Project ID and amount are required'
      });
    }

    // Verify project exists and user is authorized
    const project = await Project.findByPk(projectId, {
      include: [
        {
          model: User,
          as: 'poster',
          attributes: ['id', 'username', 'email']
        },
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'username', 'email']
        }
      ]
    });

    if (!project) {
      return res.status(404).json({
        error: 'Project not found'
      });
    }

    // Only project owner can create payment intent
    if (project.postedBy !== req.user.id) {
      return res.status(403).json({
        error: 'Only the project owner can initiate payment'
      });
    }

    // Project must be completed or in-progress
    if (!['completed', 'in-progress'].includes(project.status)) {
      return res.status(400).json({
        error: 'Payment can only be made for in-progress or completed projects'
      });
    }

    // Validate amount (convert to smallest currency unit - paise for INR)
    const amountInSmallestUnit = Math.round(parseFloat(amount) * 100);

    if (amountInSmallestUnit < 50) { // Minimum 50 paise (₹0.50)
      return res.status(400).json({
        error: 'Minimum payment amount is ₹0.50'
      });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInSmallestUnit,
      currency: currency,
      metadata: {
        projectId: project.id.toString(),
        projectTitle: project.title,
        payerId: req.user.id.toString(),
        payerEmail: req.user.email,
        recipientId: project.assignedTo ? project.assignedTo.toString() : '',
        recipientEmail: project.assignee ? project.assignee.email : ''
      },
      description: `Payment for project: ${project.title}`,
      receipt_email: req.user.email
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: amountInSmallestUnit,
      currency: currency,
      project: {
        id: project.id,
        title: project.title,
        status: project.status
      }
    });

  } catch (error) {
    console.error('Create payment intent error:', error);
    
    if (error.type === 'StripeCardError') {
      return res.status(400).json({
        error: error.message
      });
    }
    
    res.status(500).json({
      error: 'Failed to create payment intent'
    });
  }
});

/**
 * @route   POST /api/payments/confirm-payment
 * @desc    Confirm payment completion and update project
 * @access  Private
 */
router.post('/confirm-payment', authenticate, async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({
        error: 'Payment intent ID is required'
      });
    }

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (!paymentIntent) {
      return res.status(404).json({
        error: 'Payment intent not found'
      });
    }

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        error: 'Payment has not been completed successfully'
      });
    }

    const projectId = parseInt(paymentIntent.metadata.projectId);
    const project = await Project.findByPk(projectId);

    if (!project) {
      return res.status(404).json({
        error: 'Project not found'
      });
    }

    // Verify user is authorized
    if (project.postedBy !== req.user.id) {
      return res.status(403).json({
        error: 'Only the project owner can confirm payment'
      });
    }

    // Update project status to completed if payment is successful
    if (project.status === 'in-progress') {
      await project.update({
        status: 'completed',
        completedAt: new Date()
      });
    }

    // Update assignee's total earnings
    if (project.assignedTo) {
      const assignee = await User.findByPk(project.assignedTo);
      if (assignee) {
        const paymentAmount = paymentIntent.amount / 100; // Convert from paise to rupees
        await assignee.update({
          totalEarnings: parseFloat(assignee.totalEarnings) + paymentAmount
        });
      }
    }

    res.json({
      message: 'Payment confirmed successfully',
      paymentIntent: {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status
      },
      project: {
        id: project.id,
        title: project.title,
        status: project.status
      }
    });

  } catch (error) {
    console.error('Confirm payment error:', error);
    
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({
        error: error.message
      });
    }
    
    res.status(500).json({
      error: 'Failed to confirm payment'
    });
  }
});

/**
 * @route   GET /api/payments/payment-history
 * @desc    Get payment history for current user
 * @access  Private
 */
router.get('/payment-history', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, type = 'all' } = req.query;

    // Get payment intents from Stripe for this user
    const stripePayments = await stripe.paymentIntents.list({
      limit: parseInt(limit),
      created: {
        gte: Math.floor(Date.now() / 1000) - (365 * 24 * 60 * 60) // Last year
      }
    });

    // Filter payments by user
    const userPayments = stripePayments.data.filter(payment => {
      const isUserPayment = payment.metadata.payerId === req.user.id.toString();
      const isUserRecipient = payment.metadata.recipientId === req.user.id.toString();
      
      if (type === 'sent') return isUserPayment;
      if (type === 'received') return isUserRecipient;
      return isUserPayment || isUserRecipient;
    });

    // Get project details for each payment
    const paymentsWithProjects = await Promise.all(
      userPayments.map(async (payment) => {
        let project = null;
        if (payment.metadata.projectId) {
          project = await Project.findByPk(payment.metadata.projectId, {
            attributes: ['id', 'title', 'category', 'status'],
            include: [
              {
                model: User,
                as: 'poster',
                attributes: ['id', 'username', 'firstName', 'lastName']
              },
              {
                model: User,
                as: 'assignee',
                attributes: ['id', 'username', 'firstName', 'lastName']
              }
            ]
          });
        }

        return {
          id: payment.id,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          created: payment.created,
          description: payment.description,
          receiptEmail: payment.receipt_email,
          project,
          type: payment.metadata.payerId === req.user.id.toString() ? 'sent' : 'received'
        };
      })
    );

    res.json({
      payments: paymentsWithProjects,
      pagination: {
        currentPage: parseInt(page),
        hasNextPage: stripePayments.has_more,
        totalPayments: userPayments.length
      }
    });

  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      error: 'Failed to get payment history'
    });
  }
});

/**
 * @route   GET /api/payments/earnings
 * @desc    Get earnings summary for current user
 * @access  Private
 */
router.get('/earnings', authenticate, async (req, res) => {
  try {
    // Get user's total earnings from database
    const user = await User.findByPk(req.user.id, {
      attributes: ['totalEarnings']
    });

    // Get completed projects as freelancer
    const completedProjects = await Project.count({
      where: {
        assignedTo: req.user.id,
        status: 'completed'
      }
    });

    // Get payments received from Stripe
    const stripePayments = await stripe.paymentIntents.list({
      limit: 100,
      created: {
        gte: Math.floor(Date.now() / 1000) - (365 * 24 * 60 * 60) // Last year
      }
    });

    const receivedPayments = stripePayments.data.filter(payment => 
      payment.metadata.recipientId === req.user.id.toString() && 
      payment.status === 'succeeded'
    );

    // Calculate monthly earnings for the last 6 months
    const monthlyEarnings = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = Math.floor(monthDate.getTime() / 1000);
      const monthEnd = Math.floor(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getTime() / 1000);
      
      const monthPayments = receivedPayments.filter(payment => 
        payment.created >= monthStart && payment.created <= monthEnd
      );
      
      const monthTotal = monthPayments.reduce((sum, payment) => sum + payment.amount, 0) / 100;
      
      monthlyEarnings.push({
        month: monthDate.toLocaleString('default', { month: 'long', year: 'numeric' }),
        amount: monthTotal,
        transactionCount: monthPayments.length
      });
    }

    // Calculate this month's earnings
    const thisMonthStart = Math.floor(new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000);
    const thisMonthPayments = receivedPayments.filter(payment => payment.created >= thisMonthStart);
    const thisMonthEarnings = thisMonthPayments.reduce((sum, payment) => sum + payment.amount, 0) / 100;

    res.json({
      totalEarnings: user.totalEarnings,
      thisMonthEarnings,
      completedProjects,
      totalTransactions: receivedPayments.length,
      monthlyEarnings,
      averageProjectValue: completedProjects > 0 ? user.totalEarnings / completedProjects : 0
    });

  } catch (error) {
    console.error('Get earnings error:', error);
    res.status(500).json({
      error: 'Failed to get earnings data'
    });
  }
});

/**
 * @route   POST /api/payments/webhook
 * @desc    Handle Stripe webhooks
 * @access  Public (Stripe only)
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('PaymentIntent succeeded:', paymentIntent.id);
      
      // You can add additional processing here
      // For example, sending notification emails, updating project status, etc.
      
      break;
    
    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      console.log('PaymentIntent failed:', failedPayment.id);
      
      // Handle failed payment
      // You might want to notify the user or update project status
      
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

module.exports = router;