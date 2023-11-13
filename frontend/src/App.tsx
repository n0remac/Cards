import Button from 'react-bootstrap/Button';
import { cardService } from './service';
import { useEffect } from 'react';
 
 export default function App() {
    useEffect(() => {
        (async () => {
            console.log(await cardService.getCards({}));
        })();
    });
    
    return (
        <div>
            <Button>Test</Button>
        </div>
    )
  }