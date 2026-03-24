/**
 * SharedLinkModalManager - Handles password modal creation and interaction
 */
function createSharedLinkModalManager() {
    
    /**
     * Create a password input modal
     * @returns {Promise} Promise that resolves with decryption result
     */
    function createPasswordModal() {
        // Create a modal for password input
        const passwordModal = document.createElement('div');
        passwordModal.className = 'modal active';
        passwordModal.id = 'password-modal';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        
        const heading = document.createElement('h2');
        heading.textContent = 'Enter Password';
        
        const paragraph = document.createElement('p');
        paragraph.textContent = 'This shared link is password-protected. Please enter the password to decrypt the data.';
        
        const form = document.createElement('form');
        form.id = 'password-form';
        
        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';
        
        const label = document.createElement('label');
        label.htmlFor = 'decrypt-password';
        label.textContent = 'Password / session key';
        
        const input = document.createElement('input');
        input.type = 'password';
        input.id = 'decrypt-password';
        input.placeholder = 'Enter password';
        input.required = true;
        
        const formActions = document.createElement('div');
        formActions.className = 'form-actions';
        
        const submitButton = document.createElement('button');
        submitButton.type = 'submit';
        submitButton.className = 'btn primary-btn';
        submitButton.textContent = 'Decrypt';
        
        // Assemble the modal
        formGroup.appendChild(label);
        formGroup.appendChild(input);
        
        formActions.appendChild(submitButton);
        
        form.appendChild(formGroup);
        form.appendChild(formActions);
        
        modalContent.appendChild(heading);
        modalContent.appendChild(paragraph);
        modalContent.appendChild(form);
        
        passwordModal.appendChild(modalContent);
        
        // Add to document
        document.body.appendChild(passwordModal);
        
        // Focus the input
        input.focus();
        
        return {
            modal: passwordModal,
            form: form,
            input: input,
            paragraph: paragraph
        };
    }
    
    /**
     * Handle modal interactions and cleanup
     * @param {Object} modalElements - Modal DOM elements
     * @param {Function} onSubmit - Callback for form submission
     * @param {Function} onCancel - Callback for modal cancellation
     */
    function setupModalInteractions(modalElements, onSubmit, onCancel) {
        const { modal, form, input, paragraph } = modalElements;
        
        // Handle form submission
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const password = input.value.trim();
            if (!password) return;
            onSubmit(password, { input, paragraph });
        });
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                onCancel();
            }
        });
        
        // Handle escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape' && document.getElementById('password-modal')) {
                document.removeEventListener('keydown', escapeHandler);
                modal.remove();
                onCancel();
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }
    
    /**
     * Show error message in modal
     * @param {HTMLElement} paragraph - Error message element
     * @param {HTMLElement} input - Password input element
     * @param {string} message - Error message to display
     */
    function showModalError(paragraph, input, message) {
        paragraph.textContent = message;
        paragraph.style.color = 'red';
        input.value = '';
        input.focus();
    }
    
    return {
        createPasswordModal,
        setupModalInteractions,
        showModalError
    };
}

window.SharedLinkModalManager = createSharedLinkModalManager();