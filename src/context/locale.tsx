export interface Translation {
  us: string;
  it: string;
}

const template = {
  us: '',
  it: ''
}

export interface Locale {
  [key: string]: {
    [key: string]: string | Translation;
  } | Array<Translation>;
}

export const locale: Locale = {
  choose_session: {
    us: 'Avaliable sessions',
    it: 'Sessioni disponibili'
  }, 
  _please_wait: {
    us: 'Please wait',
    it: 'Attendere prego'
  },  
  submit: {
    us: 'Submit',
    it: 'Invia'
  },
  logout: {
    us: 'Logout',
    it: 'Esci'
  },
  have_a_question: {
    us: 'Have problem with authorization?',
    it: 'Hai problemi con l\'autorizzazione?'
  },
  please_choose_an_indexes: {
    us: 'Which index we should use to request a server?',
    it: 'Quale indice dovremmo usare per richiedere il server?'
  },
  please_choose_an_operations: {
    us: 'Which operation we should use to request a server?',
    it: 'Quale operazione dovremmo usare per richiedere il server?'
  },
  login_failed: {
    us: 'Login failed with message: ',
    it: 'Accesso non riuscito con messaggio: ',
  },
  choose_bucket: {
    us: 'Please, choose time limitation for data visualising',
    it: 'Per favore, scegli la limitazione temporale per la visualizzazione dei dati'
  },
  last: {
    day: {
      us: 'Last 24 hours',
      it: 'Ultime 24 ore'
    },
    week: {
      us: 'Last 7 days',
      it: 'Ultimi 7 giorni'
    },
    month: {
      us: 'Last 30 days',
      it: 'Ultimi 30 giorni'
    },
    full: {
      us: 'View all data',
      it: 'Visualizza tutti i dati'
    }
  },
  operation: {
    set_name: {
      us: 'Title of operation... (example: Test operation)',
      it: 'Titolo dell\'operazione... (esempio: Operazione di test)',
    },
    set_description: {
      us: 'Description of operation...',
      it: 'Descrizione dell\'operazione...',
    },    
    create_with_name: {
      us: 'Create operation with name: ',
      it: 'Crea operazione con nome: '
    },
    create: {
      us: 'Create operation',
      it: 'Crea operazione'
    }
  },
  timeline: {
    set_start: {
      us: 'Select start date to display data',
      it: 'Seleziona la data di inizio per visualizzare i dati'
    },
    set_end: {
      us: 'Select end date to display data',
      it: 'Seleziona la data di fine per visualizzare i dati'
    },
    set_all: {
      us: 'Select statr and end date to display data',
      it: 'Seleziona la data di inizio e di fine per visualizzare i dati'
    }    
  },
  select_context: {
    title: {
      us: 'Select context and files to display',
      it: 'Seleziona il contesto e i file da visualizzare'
    }    
  }
}
