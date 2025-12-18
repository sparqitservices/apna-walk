
export const updateMetadata = (title?: string, description?: string) => {
  if (title) {
    document.title = `${title} | ApnaWalk`;
  }
  
  if (description) {
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', description);
    }
  }
};

export const updateOGTags = (title: string, description: string) => {
  const tags = {
    'og:title': title,
    'og:description': description,
    'twitter:title': title,
    'twitter:description': description
  };

  Object.entries(tags).forEach(([property, content]) => {
    const meta = document.querySelector(`meta[property="${property}"]`) || 
                 document.querySelector(`meta[name="${property}"]`);
    if (meta) {
      meta.setAttribute('content', content);
    }
  });
};
