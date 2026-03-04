export interface FieldTypeDefinition {
  key: string;
  icon: string;
  label: string;
  category: 'input' | 'media' | 'specialized' | 'layout';
  description: string;
  defaultConfig: Record<string, unknown>;
}

export const FIELD_TYPES: Record<string, FieldTypeDefinition> = {
  TEXT: {
    key: 'text',
    icon: 'text_fields',
    label: 'Text Input',
    category: 'input',
    description: 'Single-line text input field',
    defaultConfig: {
      minLength: 0,
      maxLength: 255,
      pattern: null,
    },
  },
  TEXTAREA: {
    key: 'textarea',
    icon: 'notes',
    label: 'Text Area',
    category: 'input',
    description: 'Multi-line text input field',
    defaultConfig: {
      rows: 4,
      minLength: 0,
      maxLength: 2000,
    },
  },
  EMAIL: {
    key: 'email',
    icon: 'mail',
    label: 'Email Field',
    category: 'input',
    description: 'Email address input with validation',
    defaultConfig: {
      validateFormat: true,
    },
  },
  PHONE: {
    key: 'phone',
    icon: 'phone',
    label: 'Phone Number',
    category: 'input',
    description: 'Phone number input with formatting',
    defaultConfig: {
      format: 'international',
      countries: [],
    },
  },
  NUMBER: {
    key: 'number',
    icon: 'tag',
    label: 'Number Input',
    category: 'input',
    description: 'Numeric input field',
    defaultConfig: {
      min: null,
      max: null,
      step: 1,
    },
  },
  FILE: {
    key: 'file',
    icon: 'upload_file',
    label: 'File Upload',
    category: 'media',
    description: 'File upload with type and size validation',
    defaultConfig: {
      acceptedTypes: ['pdf', 'jpg', 'jpeg', 'png'],
      maxSize: 10,
      maxFiles: 5,
    },
  },
  VIDEO: {
    key: 'video',
    icon: 'videocam',
    label: 'Video Player',
    category: 'media',
    description: 'Embedded video player for training content',
    defaultConfig: {
      autoplay: false,
      controls: true,
      requiredWatchPercentage: 80,
    },
  },
  CHECKBOX: {
    key: 'checkbox',
    icon: 'check_box',
    label: 'Checkbox',
    category: 'input',
    description: 'Single checkbox for agreements',
    defaultConfig: {
      defaultChecked: false,
    },
  },
  CHECKBOXGROUP: {
    key: 'checkbox_group',
    icon: 'checklist',
    label: 'Checkbox Group',
    category: 'input',
    description: 'Multiple checkboxes for selections',
    defaultConfig: {
      options: [],
      minSelections: 0,
      maxSelections: null,
    },
  },
  RADIO: {
    key: 'radio',
    icon: 'radio_button_checked',
    label: 'Radio Buttons',
    category: 'input',
    description: 'Single selection from multiple options',
    defaultConfig: {
      options: [],
      layout: 'vertical',
    },
  },
  DROPDOWN: {
    key: 'dropdown',
    icon: 'arrow_drop_down',
    label: 'Dropdown',
    category: 'input',
    description: 'Dropdown select field',
    defaultConfig: {
      options: [],
      searchable: false,
      placeholder: 'Select an option',
    },
  },
  DATE: {
    key: 'date',
    icon: 'calendar_today',
    label: 'Date Picker',
    category: 'input',
    description: 'Date selection field',
    defaultConfig: {
      minDate: null,
      maxDate: null,
      format: 'yyyy-MM-dd',
    },
  },
  SIGNATURE: {
    key: 'signature',
    icon: 'draw',
    label: 'E-Signature',
    category: 'specialized',
    description: 'Digital signature capture',
    defaultConfig: {
      signatureType: 'draw',
      requireFullName: true,
    },
  },
  SKILLS: {
    key: 'skills_picker',
    icon: 'award_star',
    label: 'Skills Picker',
    category: 'specialized',
    description: 'Multi-select skills from predefined list',
    defaultConfig: {
      maxSelections: 10,
      allowCustom: true,
    },
  },
  HEADING: {
    key: 'heading',
    icon: 'title',
    label: 'Section Heading',
    category: 'layout',
    description: 'Section title for organizing form',
    defaultConfig: {
      level: 2,
    },
  },
  PARAGRAPH: {
    key: 'paragraph',
    icon: 'notes',
    label: 'Info Text',
    category: 'layout',
    description: 'Informational text or instructions',
    defaultConfig: {
      markdown: false,
    },
  },
  DIVIDER: {
    key: 'divider',
    icon: 'horizontal_rule',
    label: 'Divider',
    category: 'layout',
    description: 'Visual separator between sections',
    defaultConfig: {},
  },
};

export const FIELD_TYPE_CATEGORIES = {
  input: {
    label: 'Input Elements',
    description: 'Basic form input fields',
    types: ['TEXT', 'TEXTAREA', 'EMAIL', 'PHONE', 'NUMBER', 'DATE'],
  },
  media: {
    label: 'Media & Files',
    description: 'File uploads and media players',
    types: ['FILE', 'VIDEO'],
  },
  specialized: {
    label: 'Specialized',
    description: 'Advanced interactive components',
    types: ['SIGNATURE', 'SKILLS', 'CHECKBOX', 'CHECKBOXGROUP', 'RADIO', 'DROPDOWN'],
  },
  layout: {
    label: 'Layout',
    description: 'Content and organization elements',
    types: ['HEADING', 'PARAGRAPH', 'DIVIDER'],
  },
};

export function getFieldTypeByKey(key: string): FieldTypeDefinition | undefined {
  return Object.values(FIELD_TYPES).find((type) => type.key === key);
}

export function getFieldTypesByCategory(category: string): FieldTypeDefinition[] {
  return Object.values(FIELD_TYPES).filter((type) => type.category === category);
}
