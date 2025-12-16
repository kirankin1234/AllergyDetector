import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Layout, Typography } from 'antd';
import MainPage from './components/MainPage';
import AdminAllergens from './components/AdminAllergens';

const { Header, Footer, Content } = Layout;
const { Title, Paragraph } = Typography;

function AppContent() {
  const location = useLocation();
  
  // Full screen ONLY for /main, admin gets layout
  const isFullScreen = location.pathname === '/main';
  const isAdmin = location.pathname === '/admin';
  
  return (
    <>
      {!isFullScreen ? (
        <Layout style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          {/* Clean Header - UNCHANGED */}
          <Header style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '0 24px',
            height: 70,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 20px rgba(102,126,234,0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 36, height: 36, background: 'rgba(255,255,255,0.2)',
                borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {isAdmin ? '⚙️' : '🚨'}
              </div>
              <Title level={4} style={{ color: 'white', margin: 0, fontWeight: 800 }}>
                {isAdmin ? 'Admin Panel' : 'Allergy Detector'}
              </Title>
            </div>
            <Paragraph style={{ color: 'rgba(255,255,255,0.9)', margin: 0, fontSize: 14 }}>
              {isAdmin ? 'Allergen Management' : 'Instant allergen detection'}
            </Paragraph>
          </Header>

          <Content style={{ padding: '24px', flex: 1 }}>
            <Routes>
              <Route path="/main" element={<MainPage />} />
              <Route path="/admin" element={<AdminAllergens />} />
              <Route path="*" element={<MainPage />} />
            </Routes>
          </Content>

          <Footer style={{
            textAlign: 'center',
            padding: '20px',
            background: 'rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.9)',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ fontWeight: 600 }}>Allergy Detector © 2025</div>
            <div style={{ fontSize: 13 }}>Made with ❤️ for your safety</div>
          </Footer>
        </Layout>
      ) : (
        <Routes>
          <Route path="/main" element={<MainPage />} />
        </Routes>
      )}
    </>
  );
}

function App() {
  return <AppContent />;
}

export default App;
