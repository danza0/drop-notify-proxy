export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, phone } = req.body;

    if (!email || !phone) {
      return res.status(400).json({ error: 'Email and phone are required' });
    }

    const mutation = `
      mutation customerCreate($input: CustomerInput!) {
        customerCreate(input: $input) {
          customer {
            id
            email
            phone
            tags
            emailMarketingConsent {
              marketingState
            }
            smsMarketingConsent {
              marketingState
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const response = await fetch(
      'https://reworkedstore.myshopify.com/admin/api/2026-01/graphql.json',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_TOKEN,
        },
        body: JSON.stringify({
          query: mutation,
          variables: {
            input: {
              email: email,
              phone: phone,
              emailMarketingConsent: {
                marketingState: 'SUBSCRIBED',
                marketingOptInLevel: 'SINGLE_OPT_IN'
              },
              smsMarketingConsent: {
                marketingState: 'SUBSCRIBED',
                marketingOptInLevel: 'SINGLE_OPT_IN'
              },
              tags: ['next-drop-notify', 'prospect']
            }
          }
        })
      }
    );

    const data = await response.json();

    if (data.errors) {
      return res.status(500).json({ success: false, error: data.errors });
    }

    const userErrors = data?.data?.customerCreate?.userErrors;
    if (userErrors && userErrors.length > 0) {
      return res.status(400).json({ success: false, errors: userErrors });
    }

    return res.status(200).json({ success: true, customer: data.data.customerCreate.customer });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
