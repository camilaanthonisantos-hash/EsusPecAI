export const formatName = (text?: string): string => {
  if (!text || typeof text !== 'string') return '';
  
  const exceptions = ['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'na', 'no', 'nas', 'nos'];
  
  return text
    .toLowerCase()
    .split(/\s+/) // handle multiple spaces
    .map((word, index) => {
      // Handle empty words from multiple spaces
      if (!word) return word;

      // Always capitalize the first word
      if (index === 0) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      
      // Check if it's an exception
      if (exceptions.includes(word)) {
        return word;
      }
      
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
};

export const formatEmail = (email?: string): string => {
  if (!email || typeof email !== 'string') return '';
  return email.toLowerCase().trim();
};
