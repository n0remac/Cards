import { BrowserRouter as Router } from 'react-router-dom';
import Demo from './pages/Demo';
import { Routes, Route } from 'react-router-dom';
import TemplateForm from './pages/TemplateForm';
import TemplateBuilder from './pages/TemplateBuilder';
import BiomeSelector from './pages/Biomes';



export default function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Demo />} />
                <Route path="/template" element={<TemplateForm />} />
                <Route path="/template/builder" element={<TemplateBuilder />} />
                <Route path="/biomes" element={<BiomeSelector />} />

            </Routes>
        </Router>
    );
}
