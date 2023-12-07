import { BrowserRouter as Router } from 'react-router-dom';
import Demo from './pages/Demo';
import { Routes, Route } from 'react-router-dom';
import TemplateForm from './pages/TemplateForm';
import TemplateBuilder from './pages/TemplateBuilder';



export default function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Demo />} />
                <Route path="/template" element={<TemplateForm />} />
                <Route path="/template/builder" element={<TemplateBuilder />} />
            </Routes>
        </Router>

    );
}
