import {
  isAllowedExtension,
  getFileCategory,
  validateMimeAndExtension,
} from './file-validation.util';

describe('FileValidationUtil', () => {
  describe('isAllowedExtension', () => {
    it('should allow common image extensions', () => {
      expect(isAllowedExtension('photo.jpg')).toBe(true);
      expect(isAllowedExtension('image.png')).toBe(true);
      expect(isAllowedExtension('icon.gif')).toBe(true);
    });

    it('should allow PDF', () => {
      expect(isAllowedExtension('doc.pdf')).toBe(true);
    });

    it('should allow text files', () => {
      expect(isAllowedExtension('readme.txt')).toBe(true);
      expect(isAllowedExtension('notes.md')).toBe(true);
    });

    it('should allow archives', () => {
      expect(isAllowedExtension('archive.zip')).toBe(true);
      expect(isAllowedExtension('backup.tar')).toBe(true);
    });

    it('should reject disallowed extensions', () => {
      expect(isAllowedExtension('malware.exe')).toBe(false);
      expect(isAllowedExtension('script.dll')).toBe(false);
    });
  });

  describe('getFileCategory', () => {
    it('should categorize images', () => {
      expect(getFileCategory('image/jpeg')).toBe('image');
      expect(getFileCategory('image/png')).toBe('image');
    });

    it('should categorize PDF', () => {
      expect(getFileCategory('application/pdf')).toBe('pdf');
    });

    it('should categorize text', () => {
      expect(getFileCategory('text/plain')).toBe('text');
      expect(getFileCategory('application/json')).toBe('text');
    });

    it('should categorize binary', () => {
      expect(getFileCategory('application/zip')).toBe('binary');
      expect(getFileCategory('application/octet-stream')).toBe('binary');
    });
  });

  describe('validateMimeAndExtension', () => {
    it('should validate matching MIME and extension', () => {
      expect(validateMimeAndExtension('image/jpeg', 'photo.jpg')).toBe(true);
      expect(validateMimeAndExtension('application/pdf', 'doc.pdf')).toBe(true);
    });

    it('should reject mismatched MIME and extension for known types', () => {
      expect(validateMimeAndExtension('image/jpeg', 'file.png')).toBe(false);
    });

    it('should reject disallowed extensions', () => {
      expect(
        validateMimeAndExtension('application/octet-stream', 'file.exe'),
      ).toBe(false);
    });
  });
});
