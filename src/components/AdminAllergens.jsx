// src/components/AdminAllergens.jsx
// LOGIC & FUNCTIONALITY: UNCHANGED
// FIX: Mobile sidebar converted to Drawer (no overlap)

import React, { useState, useEffect, useCallback } from 'react';
import {
    Layout, Menu, Table, Button, Form, Input, Select, Modal, Tag,
    Space, Typography, Card, Row, Col, message, Alert, ConfigProvider,
    Grid, Drawer
} from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined,
    DashboardOutlined, SettingOutlined, DatabaseOutlined,
    MenuFoldOutlined, MenuUnfoldOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { API_BASE_URL } from './config';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;
const { useBreakpoint } = Grid;

const BACKEND_URL = `${API_BASE_URL}/allergens`;

const AdminAllergens = () => {
    const screens = useBreakpoint();
    const isMobile = !screens.md;

    const [collapsed, setCollapsed] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);

    const [allergens, setAllergens] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingAllergen, setEditingAllergen] = useState(null);
    const [backendStatus, setBackendStatus] = useState('checking');

    const [form] = Form.useForm();

    /* ================= BACKEND ================= */
    const fetchAllergens = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(BACKEND_URL);
            if (!res.ok) throw new Error();
            const data = await res.json();
            setAllergens(data.map(a => ({ ...a, key: a._id || a.id })));
            setBackendStatus('connected');
        } catch {
            setBackendStatus('disconnected');
            message.error('Backend not reachable');
        } finally {
            setLoading(false);
        }
    }, []);

    const checkBackendStatus = useCallback(async () => {
        setBackendStatus('checking');
        try {
            const res = await fetch(BACKEND_URL);
            if (!res.ok) throw new Error();
            setBackendStatus('connected');
            return true;
        } catch {
            setBackendStatus('disconnected');
            return false;
        }
    }, []);

    useEffect(() => {
        checkBackendStatus().then(ok => ok && fetchAllergens());
    }, [checkBackendStatus, fetchAllergens]);

    /* ================= CRUD ================= */
    const saveAllergen = async (values) => {
        if (backendStatus !== 'connected') return message.error('Backend offline');

        const keywords = values.keywords.split(',').map(k => k.trim()).filter(Boolean);
        const isEdit = Boolean(editingAllergen);

        setLoading(true);
        try {
            const res = await fetch(
                isEdit
                    ? `${BACKEND_URL}/${editingAllergen._id || editingAllergen.id}`
                    : BACKEND_URL,
                {
                    method: isEdit ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...values, keywords }),
                }
            );
            if (!res.ok) throw new Error();

            message.success(isEdit ? 'Updated successfully' : 'Added successfully');
            fetchAllergens();
            setModalVisible(false);
            setEditingAllergen(null);
            form.resetFields();
        } catch {
            message.error('Save failed');
        } finally {
            setLoading(false);
        }
    };

    const deleteAllergen = (id) => {
        Modal.confirm({
            title: 'Delete Allergen',
            content: 'This action cannot be undone',
            onOk: async () => {
                setLoading(true);
                try {
                    const res = await fetch(`${BACKEND_URL}/${id}`, { method: 'DELETE' });
                    if (!res.ok) throw new Error();
                    message.success('Deleted');
                    fetchAllergens();
                } catch {
                    message.error('Delete failed');
                } finally {
                    setLoading(false);
                }
            },
        });
    };

    /* ================= TABLE ================= */
    const columns = [
        { title: 'Allergen', dataIndex: 'name', ellipsis: true },
        {
            title: 'Keywords',
            dataIndex: 'keywords',
            responsive: ['md'],
            render: (k = []) => (
                <Space wrap>
                    {k.slice(0, 3).map((x, i) => <Tag key={i}>{x}</Tag>)}
                    {k.length > 3 && <Tag>+{k.length - 3}</Tag>}
                </Space>
            ),
        },
        {
            title: 'Severity',
            dataIndex: 'severity',
            width: 110,
            render: s => <Tag color={{ HIGH: 'red', MEDIUM: 'gold', LOW: 'blue' }[s]}>{s}</Tag>,
        },
        {
            title: 'Actions',
            width: 110,
            render: (_, r) => (
                <Space>
                    <Button
                        type="text"
                        icon={<EditOutlined />}
                        onClick={() => {
                            setEditingAllergen(r);
                            form.setFieldsValue({ ...r, keywords: r.keywords.join(', ') });
                            setModalVisible(true);
                        }}
                    />
                    <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => deleteAllergen(r._id || r.id)}
                    />
                </Space>
            ),
        },
    ];

    /* ================= UI ================= */
    return (
        <ConfigProvider theme={{ token: { fontFamily: 'Poppins, sans-serif', colorPrimary: '#5b6cff', borderRadius: 14 } }}>
            <Layout style={{ minHeight: '100vh' }}>

                {/* DESKTOP SIDEBAR */}
                {!isMobile && (
                    <Sider collapsed={collapsed} collapsedWidth={80} trigger={null} width={260}>
                        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 600 }}>
                            ADMIN PANEL
                        </div>
                        <Menu
                            theme="dark"
                            mode="inline"
                            defaultSelectedKeys={['allergens']}
                            items={[
                                { key: 'dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
                                { key: 'allergens', icon: <DatabaseOutlined />, label: 'Allergens' },
                                { key: 'settings', icon: <SettingOutlined />, label: 'Settings' },
                            ]}
                        />
                    </Sider>
                )}

                {/* MOBILE DRAWER */}
                {isMobile && (
                    <Drawer
                        placement="left"
                        open={drawerOpen}
                        onClose={() => setDrawerOpen(false)}
                        width={260}
                        bodyStyle={{ padding: 0 }}
                    >
                        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
                            ADMIN PANEL
                        </div>
                        <Menu
                            mode="inline"
                            defaultSelectedKeys={['allergens']}
                            onClick={() => setDrawerOpen(false)}
                            items={[
                                { key: 'dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
                                { key: 'allergens', icon: <DatabaseOutlined />, label: 'Allergens' },
                                { key: 'settings', icon: <SettingOutlined />, label: 'Settings' },
                            ]}
                        />
                    </Drawer>
                )}

                {/* MAIN */}
                <Layout>
                    <Header style={{ background: '#fff', padding: '0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Button
                            type="text"
                            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                            onClick={() => {
                                if (isMobile) setDrawerOpen(true);
                                else setCollapsed(!collapsed);
                            }}
                        />
                        <Space>
                            <Tag color={backendStatus === 'connected' ? 'green' : backendStatus === 'checking' ? 'blue' : 'red'}>
                                {backendStatus}
                            </Tag>
                            <Button size="small" onClick={() => checkBackendStatus().then(ok => ok && fetchAllergens())}>
                                Sync
                            </Button>
                        </Space>
                    </Header>

                    <Content style={{ padding: 16, background: '#f4f6fb' }}>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                            {backendStatus === 'disconnected' && (
                                <Alert
                                    type="warning"
                                    showIcon
                                    message="Backend Offline"
                                    description="Start FastAPI server to save changes."
                                    style={{ marginBottom: 16 }}
                                />
                            )}

                            <Row gutter={[16, 16]}>
                                <Col span={24}>
                                    <Card>
                                        <Row justify="space-between" align="middle">
                                            <Col>
                                                <Title level={4}>Allergens</Title>
                                                <Text type="secondary">Manage allergy detection database</Text>
                                            </Col>
                                            <Col>
                                                <Button
                                                    type="primary"
                                                    icon={<PlusOutlined />}
                                                    onClick={() => {
                                                        form.resetFields();
                                                        setEditingAllergen(null);
                                                        setModalVisible(true);
                                                    }}
                                                >
                                                    Add Allergen
                                                </Button>
                                            </Col>
                                        </Row>
                                    </Card>
                                </Col>

                                <Col span={24}>
                                    <Card>
                                        <Table
                                            columns={columns}
                                            dataSource={allergens}
                                            loading={loading}
                                            pagination={{ pageSize: isMobile ? 6 : 10 }}
                                            scroll={{ x: 900 }}
                                        />
                                    </Card>
                                </Col>
                            </Row>
                        </motion.div>
                    </Content>
                </Layout>
            </Layout>

            {/* MODAL */}
            <Modal
                title={editingAllergen ? 'Edit Allergen' : 'Add Allergen'}
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                onOk={() => form.submit()}
                confirmLoading={loading}
                width={isMobile ? '95%' : 600}
            >
                <Form layout="vertical" form={form} onFinish={saveAllergen} initialValues={{ severity: 'MEDIUM' }}>
                    <Form.Item name="name" label="Allergy Name" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="keywords" label="Keywords (comma separated)" rules={[{ required: true }]}>
                        <Input.TextArea rows={3} />
                    </Form.Item>
                    <Form.Item name="severity" label="Severity" rules={[{ required: true }]}>
                        <Select>
                            <Option value="HIGH">HIGH</Option>
                            <Option value="MEDIUM">MEDIUM</Option>
                            <Option value="LOW">LOW</Option>
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
        </ConfigProvider>
    );
};

export default AdminAllergens;
