# FraudGuard Simulator - Contributing Guide

## Getting Started with Development

### Local Development Setup

```bash
# 1. Clone the repository
git clone https://github.com/NehmanDevelops/Fraud-Control.git
cd Fraud-Detection

# 2. Set up backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# 3. Set up frontend
cd ../frontend
npm install

# 4. Start development servers
# Terminal 1 - Backend
cd backend
python -m uvicorn main:app --reload

# Terminal 2 - Frontend
cd frontend
npm run dev
```

## Code Style Guide

### Python (Backend)
- Follow PEP 8
- Use type hints
- Write docstrings for all functions
- Maximum line length: 100 characters

```python
def predict_transaction(features: np.ndarray) -> Dict[str, float]:
    """
    Predict fraud probability for a transaction.
    
    Args:
        features: Feature vector of shape (n_features,)
        
    Returns:
        Dictionary with prediction results
    """
    pass
```

### TypeScript/React (Frontend)
- Use TypeScript for all components
- Follow React hooks conventions
- Use functional components
- Prop interfaces with `interface`

```typescript
interface TransactionProps {
  id: string;
  amount: number;
  timestamp: string;
}

const TransactionRow: React.FC<TransactionProps> = ({ id, amount, timestamp }) => {
  return <tr>...</tr>;
};
```

## Testing

### Backend Tests
```bash
cd backend
pip install pytest pytest-asyncio
pytest
```

### Frontend Tests
```bash
cd frontend
npm run test
```

## Git Workflow

### Commit Message Format
```
<type>: <description>

<optional body>

<optional footer>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style changes
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `chore`: Build, dependencies, etc.
- `test`: Test additions/changes

Examples:
```
feat: Add SHAP waterfall visualization
fix: Handle WebSocket reconnection errors
docs: Update API documentation
chore: Update dependencies
```

### Branch Naming
```
feature/feature-name
bugfix/bug-description
docs/documentation-update
```

## Pull Request Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make changes and commit: `git commit -m "feat: Add my feature"`
4. Push to your fork: `git push origin feature/my-feature`
5. Create a Pull Request with description

## Adding New Features

### Adding a New ML Model
1. Create model class in `backend/models_ml.py`
2. Implement `train()` and `predict()` methods
3. Update ensemble weights in `backend/config.py`
4. Add evaluation metrics to `scripts/evaluate.py`
5. Update API endpoints in `backend/main.py`

### Adding a New API Endpoint
1. Define request/response models using Pydantic
2. Add endpoint function to `backend/main.py`
3. Document with docstring and examples
4. Add tests to `tests/test_api.py`
5. Update API documentation

### Adding a New Frontend Component
1. Create component in `frontend/src/components/`
2. Use TypeScript interfaces for props
3. Add Tailwind styling
4. Export from component index
5. Use in parent component

## Performance Optimization

### Backend
- Use async/await for I/O operations
- Cache model predictions
- Batch requests when possible
- Profile with `cProfile`

### Frontend
- Lazy load components
- Memoize expensive computations
- Use React DevTools Profiler
- Optimize bundle size with Webpack analysis

## Debugging

### Backend
```python
import logging
logger = logging.getLogger(__name__)
logger.debug("Debug message")
logger.info("Info message")
logger.error("Error message")
```

### Frontend
```typescript
console.log("Debug:", value);
console.error("Error:", error);
// Use React DevTools browser extension
```

## Security Considerations

- Never commit secrets (API keys, passwords)
- Use `.env` for sensitive configuration
- Validate all user inputs
- Sanitize HTML output
- Use HTTPS in production

## Documentation

- Keep README.md updated
- Document public APIs
- Add code comments for complex logic
- Include examples in docstrings
- Update CHANGELOG for releases

## Questions & Support

- Open an issue for bugs
- Discuss features in Discussions
- Check existing issues before creating new ones
- Be respectful and constructive

## License

This project is licensed under MIT. See LICENSE file for details.

---

**Thank you for contributing to FraudGuard!** 🙏
