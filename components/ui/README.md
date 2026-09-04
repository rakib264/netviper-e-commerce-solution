# UI Components Documentation

## Error Dialog Component

The `ErrorDialog` component provides a reusable way to display error messages in a modal dialog instead of using browser default alerts.

### Features

- **Multiple variants**: error, warning, info
- **Customizable**: title, message, button text
- **Accessible**: Built on Radix UI primitives
- **Responsive**: Works on all screen sizes
- **TypeScript**: Fully typed with TypeScript

### Usage

#### Basic Usage with Hook (Recommended)

```tsx
import { useErrorDialog } from '@/components/ui/error-dialog';

function MyComponent() {
  const { showError, ErrorDialogComponent } = useErrorDialog();

  const handleError = () => {
    showError('Something went wrong!', 'Error Title');
  };

  return (
    <div>
      <button onClick={handleError}>Show Error</button>
      <ErrorDialogComponent />
    </div>
  );
}
```

#### Direct Component Usage

```tsx
import { ErrorDialog } from '@/components/ui/error-dialog';

function MyComponent() {
  const [errorDialog, setErrorDialog] = useState({
    open: false,
    message: '',
    title: 'Error'
  });

  return (
    <ErrorDialog
      open={errorDialog.open}
      onOpenChange={(open) => setErrorDialog(prev => ({ ...prev, open }))}
      title={errorDialog.title}
      message={errorDialog.message}
      variant="error" // 'error' | 'warning' | 'info'
    />
  );
}
```

### Hook API

#### `useErrorDialog()`

Returns an object with:

- `showError(message: string, title?: string, variant?: 'error' | 'warning' | 'info')`: Function to show error dialog
- `ErrorDialogComponent`: React component to render the dialog

### Component Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | - | Controls dialog visibility |
| `onOpenChange` | `(open: boolean) => void` | - | Callback when dialog state changes |
| `title` | `string` | `'Error'` | Dialog title |
| `message` | `string` | - | Error message content |
| `variant` | `'error' \| 'warning' \| 'info'` | `'error'` | Visual variant |
| `showCloseButton` | `boolean` | `true` | Whether to show close button |
| `closeButtonText` | `string` | `'OK'` | Close button text |
| `onClose` | `() => void` | - | Callback when dialog closes |

## Success Dialog Component

The `SuccessDialog` component provides a reusable way to display success messages in a modal dialog.

### Usage

#### Basic Usage with Hook (Recommended)

```tsx
import { useSuccessDialog } from '@/components/ui/success-dialog';

function MyComponent() {
  const { showSuccess, SuccessDialogComponent } = useSuccessDialog();

  const handleSuccess = () => {
    showSuccess('Operation completed successfully!', 'Success');
  };

  return (
    <div>
      <button onClick={handleSuccess}>Show Success</button>
      <SuccessDialogComponent />
    </div>
  );
}
```

### Hook API

#### `useSuccessDialog()`

Returns an object with:

- `showSuccess(message: string, title?: string)`: Function to show success dialog
- `SuccessDialogComponent`: React component to render the dialog

### Component Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | - | Controls dialog visibility |
| `onOpenChange` | `(open: boolean) => void` | - | Callback when dialog state changes |
| `title` | `string` | `'Success'` | Dialog title |
| `message` | `string` | - | Success message content |
| `showCloseButton` | `boolean` | `true` | Whether to show close button |
| `closeButtonText` | `string` | `'OK'` | Close button text |
| `onClose` | `() => void` | - | Callback when dialog closes |

## Migration from Browser Alerts

### Before (Browser Alert)
```tsx
alert('Invalid coupon code');
```

### After (Error Dialog)
```tsx
const { showError, ErrorDialogComponent } = useErrorDialog();

// In your error handler
showError('Invalid coupon code', 'Coupon Error');

// In your JSX
<ErrorDialogComponent />
```

## Styling

Both components use Tailwind CSS classes and follow the design system. They automatically adapt to the current theme and provide consistent styling across the application.

### Color Variants

- **Error**: Red theme with `AlertCircle` icon
- **Warning**: Yellow theme with `AlertCircle` icon  
- **Info**: Blue theme with `AlertCircle` icon
- **Success**: Green theme with `CheckCircle` icon
