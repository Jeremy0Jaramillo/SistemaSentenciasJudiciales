// src/auth-config.ts
export const msalConfig = {
    auth: {
      clientId: 'aaad0f75-155d-4ad2-9463-03586ed64f25', 
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
    