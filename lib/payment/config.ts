const b64OmiseAuth = btoa(`${process.env.NEXT_PUBLIC_OMISE_PUBLIC_KEY}:`);

export const PaymentConfig = {
    omise: {
        apiBaseUrl: 'https://api.omise.co',
        vaultBaseUrl: 'https://vault.omise.co',
        vaultAuth: `Basic ${b64OmiseAuth}`,
    }
}