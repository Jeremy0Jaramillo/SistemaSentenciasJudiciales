// src/auth-config.ts
export const msalConfig = {
    auth: {
      clientId: 'eb54c6a8-3633-45bb-9975-f6a8e9389745', // Use the Azure AD Application (client) ID
      authority: 'https://login.microsoftonline.com/6eeb49aa-436d-43e6-becd-bbdf79e5077d',
      redirectUri: 'http://localhost:4200',
    },
    cache: {
      cacheLocation: 'localStorage',
      storeAuthStateInCookie: false,
    }
  };
  
  export const loginRequest = {
    scopes: ['User.Read']
  };
    