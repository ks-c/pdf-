
export interface Paper {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  doi: string;
  journal: string;
  date: string;
  notes: string;
  translatedTitle?: string;
  translatedAbstract?: string;
}

export interface AISettings {
  url: string;
  key: string;
  model: string;
}
