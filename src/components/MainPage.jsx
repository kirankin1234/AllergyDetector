// src/components/MainPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    Button, Card, Radio, Space, Typography, Upload, Progress, Divider, Tag,
    Alert, Spin, Row, Col, Steps, message, ConfigProvider, Input,
} from 'antd';
import {
    UploadOutlined, CameraOutlined, FileTextOutlined, CopyOutlined,
    DownloadOutlined, ReloadOutlined, WarningOutlined, CheckCircleOutlined,
    HighlightOutlined, ArrowLeftOutlined, ArrowRightOutlined,
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from './config';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;
const { Dragger } = Upload;

const ALLERGENS_URL = `${API_BASE_URL}/allergens`;
const SCAN_URL = `${API_BASE_URL}/scan`;

const MainPage = () => {
    const [step, setStep] = useState(0);
    const [selectedAllergenIDs, setSelectedAllergenIDs] = useState([]);
    const [inputType, setInputType] = useState('text');
    const [inputText, setInputText] = useState('');
    const [uploadedPhoto, setUploadedPhoto] = useState(null);
    const [uploadedDoc, setUploadedDoc] = useState(null);
    const [results, setResults] = useState(null);
    const [processingProgress, setProcessingProgress] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);

    const [dynamicAllergens, setDynamicAllergens] = useState([]);
    const [dataLoading, setDataLoading] = useState(true);
    const [dataFetchError, setDataFetchError] = useState(false);

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'HIGH': return '#ff4d4f';
            case 'MEDIUM': return '#faad14';
            case 'LOW': return '#1890ff';
            default: return '#52c41a';
        }
    };

    const fetchAllergens = useCallback(async () => {
        setDataLoading(true);
        setDataFetchError(false);
        try {
            const response = await fetch(ALLERGENS_URL);
            if (!response.ok) throw new Error('Network response not ok');
            const data = await response.json();
            setDynamicAllergens(data);
        } catch (error) {
            console.error('Failed to fetch allergens:', error);
            setDataFetchError(true);
            message.error('Failed to connect to the allergen database.');
        } finally {
            setDataLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAllergens();
    }, [fetchAllergens]);

    const highlightText = useCallback((text) => {
        if (!text || !results?.matches?.length) return text;

        let highlighted = text;
        const withPos = results.matches.filter(
            (m) => m.position && m.position.start != null && m.position.end != null,
        );
        if (!withPos.length) return text;

        const sorted = [...withPos].sort((a, b) => b.position.start - a.position.start);

        sorted.forEach(({ position: { start, end }, severity }) => {
            const before = highlighted.slice(0, start);
            const match = highlighted.slice(start, end);
            const after = highlighted.slice(end);
            highlighted = `${before}<mark class="allergen-${severity.toLowerCase()}">${match}</mark>${after}`;
        });

        return highlighted;
    }, [results]);

    const processAllergens = async () => {
        setIsProcessing(true);
        setStep(2);
        setProcessingProgress(0);

        const formData = new FormData();
        selectedAllergenIDs.forEach((id) => formData.append('selected_allergen_ids', id));

        if (inputType === 'text') {
            formData.append('text', inputText);
        } else if (inputType === 'photo' && uploadedPhoto) {
            formData.append('file', uploadedPhoto);
        } else if (inputType === 'document' && uploadedDoc) {
            formData.append('file', uploadedDoc);
        }

        const steps = [25, 50, 75, 100];
        for (let i = 0; i < steps.length; i += 1) {
            // eslint-disable-next-line no-await-in-loop
            await new Promise((resolve) => setTimeout(resolve, 400));
            setProcessingProgress(steps[i]);
        }

        try {
            const response = await fetch(SCAN_URL, {
                method: 'POST',
                body: formData,
            });
            if (!response.ok) {
                let errMsg = 'Scan failed';
                try {
                    const err = await response.json();
                    if (err.detail) errMsg = err.detail;
                } catch {
                    /* ignore */
                }
                throw new Error(errMsg);
            }
            const data = await response.json();
            setResults({
                totalAllergens: selectedAllergenIDs.length,
                detectedAllergens: data.matches.length,
                matches: data.matches,
                safe: data.safe,
                timestamp: data.timestamp,
            });
            setTimeout(() => {
                setIsProcessing(false);
                setStep(3);
            }, 500);
        } catch (error) {
            console.error('processAllergens error:', error);
            setIsProcessing(false);
            message.error(error.message || 'Scan failed');
        }
    };

    const handleNextStep = () => {
        if (step === 0) {
            if (!selectedAllergenIDs.length) {
                message.error('Please select at least one allergy to scan for.');
                return;
            }
            if (dataLoading) {
                message.error('Allergy data is still loading. Please wait.');
                return;
            }
            if (dataFetchError) {
                message.error('Cannot proceed. Database connection failed.');
                return;
            }
            setStep(1);
            return;
        }

        if (step === 1) {
            if (inputType === 'text' && !inputText.trim()) {
                message.error('Please enter text content.');
                return;
            }
            if (inputType === 'photo' && !uploadedPhoto) {
                message.error('Please upload a photo.');
                return;
            }
            if (inputType === 'document' && !uploadedDoc) {
                message.error('Please upload a document.');
                return;
            }
            processAllergens();
        }
    };

    const handlePrevStep = () => {
        if (step > 0 && !isProcessing) setStep(step - 1);
    };

    const resetForm = () => {
        setSelectedAllergenIDs([]);
        setInputType('text');
        setInputText('');
        setUploadedPhoto(null);
        setUploadedDoc(null);
        setResults(null);
        setProcessingProgress(0);
        setStep(0);
        fetchAllergens();
        message.success('Form reset. Ready for new scan!');
    };

    const copyResults = () => {
        if (!results) return;
        const resultText = results.safe
            ? '✅ All Clear! No allergens detected.'
            : `🚨 ${results.detectedAllergens} allergens found: ${results.matches
                .map((m) => m.allergen)
                .join(', ')}.`;
        navigator.clipboard.writeText(resultText);
        message.success('Results copied!');
    };

    const inputContent = () => {
        switch (inputType) {
            case 'text':
                return (
                    <TextArea
                        placeholder="Paste prescription text, ingredients, recipe, or food label..."
                        rows={6}
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        maxLength={5000}
                        showCount
                        style={{ fontSize: 14 }}
                    />
                );
            case 'photo':
                return (
                    <Dragger
                        accept=".jpg,.jpeg,.png"
                        multiple={false}
                        beforeUpload={(file) => {
                            setUploadedPhoto(file);
                            message.success(`✅ Photo ${file.name} ready for OCR scan`);
                            return false;
                        }}
                        fileList={uploadedPhoto ? [uploadedPhoto] : []}
                        style={{ background: '#f0f8ff' }}
                    >
                        <div style={{ textAlign: 'center', padding: 24 }}>
                            <CameraOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
                            <Paragraph>📸 Drag photo or click to upload</Paragraph>
                            <Text type="secondary">JPG, PNG (max 5MB) - OCR will extract text</Text>
                        </div>
                    </Dragger>
                );
            case 'document':
                return (
                    <Dragger
                        accept=".pdf,.doc,.docx"
                        multiple={false}
                        beforeUpload={(file) => {
                            setUploadedDoc(file);
                            message.success(`✅ Document ${file.name} ready for processing`);
                            return false;
                        }}
                        fileList={uploadedDoc ? [uploadedDoc] : []}
                        style={{ background: '#f9f9f9' }}
                    >
                        <div style={{ textAlign: 'center', padding: 24 }}>
                            <FileTextOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 16 }} />
                            <Paragraph>📄 Drag PDF/Doc or click to upload</Paragraph>
                            <Text type="secondary">PDF, DOC, DOCX (max 10MB) - OCR extraction</Text>
                        </div>
                    </Dragger>
                );
            default:
                return null;
        }
    };

    const stepsConfig = [
        { title: 'Your Allergies', description: 'Select allergies', icon: <HighlightOutlined /> },
        { title: 'Choose Input', description: 'Text/Photo/Doc', icon: <UploadOutlined /> },
        { title: 'Processing', description: 'Your input ...', icon: <Spin size="small" spin /> },
        { title: 'Safety Report', description: 'Results ready', icon: <CheckCircleOutlined /> },
    ];

    return (
        <ConfigProvider
            theme={{
                token: {
                    fontFamily: "'Poppins', sans-serif",
                    colorPrimary: '#667eea',
                    borderRadius: 12,
                },
            }}
        >
            <div
                style={{
                    minHeight: '100vh',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    padding: '24px 16px',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundImage: `
              radial-gradient(circle at 20% 80%, rgba(120,119,198,0.3) 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, rgba(255,119,198,0.3) 0%, transparent 50%)
            `,
                        pointerEvents: 'none',
                    }}
                />

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ maxWidth: 900, margin: '0 auto', position: 'relative', zIndex: 1 }}
                >
                    <Card
                        style={{
                            textAlign: 'center',
                            marginBottom: 32,
                            background: 'rgba(255,255,255,0.95)',
                            backdropFilter: 'blur(20px)',
                        }}
                    >
                        <Title
                            level={1}
                            style={{
                                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                margin: 0,
                                fontWeight: 800,
                            }}
                        >
                            Allergy Detector
                        </Title>
                        <Paragraph style={{ color: '#666', fontSize: 18 }}>
                            Select allergies → Choose input → Get instant safety report
                        </Paragraph>
                    </Card>

                    <Card style={{ marginBottom: 32 }}>
                        <Steps current={step} size="small" items={stepsConfig} labelPlacement="vertical" />
                    </Card>

                    <AnimatePresence mode="wait">
                        {step === 0 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: -50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 50 }}
                            >
                                <Card title="Step 1: Select Your Allergies" size="large" loading={dataLoading}>
                                    {dataFetchError && (
                                        <Alert
                                            message="Connection Error"
                                            description="Could not load allergy data from the backend. Please ensure the API is running."
                                            type="error"
                                            showIcon
                                            style={{ marginBottom: 16 }}
                                        />
                                    )}
                                    {!dataFetchError && (
                                        <div style={{ height: 300, overflow: 'auto', padding: '8px 0' }}>
                                            <div
                                                style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                                                    gap: 8,
                                                }}
                                            >
                                                {dynamicAllergens.map((allergen) => (
                                                    <Tag
                                                        key={allergen._id || allergen.id}
                                                        style={{
                                                            width: '100%',
                                                            textAlign: 'center',
                                                            fontSize: 14,
                                                            padding: '8px 12px',
                                                            cursor: 'pointer',
                                                        }}
                                                        color={
                                                            selectedAllergenIDs.includes(allergen._id || allergen.id)
                                                                ? getSeverityColor(allergen.severity)
                                                                : 'default'
                                                        }
                                                        onClick={() => {
                                                            const id = allergen._id || allergen.id;
                                                            setSelectedAllergenIDs((prev) =>
                                                                prev.includes(id)
                                                                    ? prev.filter((x) => x !== id)
                                                                    : [...prev, id],
                                                            );
                                                        }}
                                                    >
                                                        {allergen.name}
                                                    </Tag>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <Divider />
                                    <Text strong style={{ fontSize: 16 }}>
                                        {selectedAllergenIDs.length} allergens selected (Total Allergies Listed: {dynamicAllergens.length})
                                    </Text>
                                </Card>

                                <Space style={{ width: '100%', marginTop: 24 }} size={16}>
                                    <Button
                                        style={{ flex: 1, height: 56, borderRadius: 28 }}
                                        size="large"
                                        onClick={handleNextStep}
                                        disabled={!selectedAllergenIDs.length || dataLoading || dataFetchError}
                                    >
                                        <ArrowRightOutlined /> Next: Choose Input Method
                                    </Button>
                                </Space>
                            </motion.div>
                        )}

                        {step === 1 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: -50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 50 }}
                            >
                                <Card title="Step 2: Choose Input Method" size="large">
                                    <Space direction="vertical" style={{ width: '100%' }} size={24}>
                                        <Card size="small" title="Select input method">
                                            <Radio.Group
                                                onChange={(e) => {
                                                    setInputType(e.target.value);
                                                    setInputText('');
                                                    setUploadedPhoto(null);
                                                    setUploadedDoc(null);
                                                }}
                                                value={inputType}
                                            >
                                                <Space direction="vertical" style={{ width: '100%' }}>
                                                    <Radio value="text">
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                            <FileTextOutlined style={{ fontSize: 24, color: '#52c41a' }} />
                                                            <span>📝 Text Input (Paste ingredients/prescription)</span>
                                                        </div>
                                                    </Radio>
                                                    <Radio value="photo">
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                            <CameraOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                                                            <span>📸 Photo Scan (Food labels, prescriptions - OCR)</span>
                                                        </div>
                                                    </Radio>
                                                    <Radio value="document">
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                            <FileTextOutlined style={{ fontSize: 24, color: '#faad14' }} />
                                                            <span>📄 Document (PDF/DOC..)</span>
                                                        </div>
                                                    </Radio>
                                                </Space>
                                            </Radio.Group>
                                        </Card>

                                        <Card title={`Input Content - ${inputType.toUpperCase()}`} size="small">
                                            {inputContent()}
                                        </Card>
                                    </Space>
                                </Card>

                                <Space style={{ width: '100%', marginTop: 24 }} size={16}>
                                    <Button
                                        icon={<ArrowLeftOutlined />}
                                        style={{ flex: 1, height: 56, borderRadius: 28 }}
                                        size="large"
                                        onClick={handlePrevStep}
                                        disabled={isProcessing}
                                    >
                                        Back
                                    </Button>
                                    <Button
                                        type="primary"
                                        style={{ flex: 2, height: 56, borderRadius: 28, fontSize: 16, fontWeight: 600 }}
                                        size="large"
                                        onClick={handleNextStep}
                                    >
                                        🔍 Let's Check
                                    </Button>
                                </Space>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                            >
                                <Card style={{ textAlign: 'center', maxWidth: 500, margin: '0 auto' }}>
                                    <Spin size="large" style={{ marginBottom: 32 }} />
                                    <Title level={4} style={{ marginBottom: 24, color: '#667eea' }}>
                                        Processing with KMP Algorithm...
                                    </Title>
                                    <Progress
                                        percent={processingProgress}
                                        size="large"
                                        strokeColor={{ '0%': '#667eea', '100%': '#764ba2' }}
                                    />
                                </Card>
                            </motion.div>
                        )}

                        {step === 3 && results && (
                            <motion.div
                                key="step4"
                                initial={{ opacity: 0, y: 50 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <Card style={{ marginBottom: 24, textAlign: 'center' }}>
                                    <Row gutter={24} align="middle" justify="center">
                                        <Col>
                                            {results.safe ? (
                                                <CheckCircleOutlined style={{ fontSize: 64, color: '#52c41a' }} />
                                            ) : (
                                                <WarningOutlined style={{ fontSize: 64, color: '#ff4d4f' }} />
                                            )}
                                        </Col>
                                        <Col flex="auto">
                                            <Title
                                                level={2}
                                                style={{ margin: 0, color: results.safe ? '#52c41a' : '#ff4d4f' }}
                                            >
                                                {results.safe
                                                    ? '✅ All Clear!'
                                                    : `🚨 ${results.detectedAllergens} Allergens Found`}
                                            </Title>
                                            <Text type="secondary">{results.timestamp}</Text>
                                        </Col>
                                    </Row>
                                </Card>

                                {!results.safe && (
                                    <Card
                                        title="Detected Allergens & Source Text"
                                        size="small"
                                        style={{ marginBottom: 16 }}
                                    >
                                        <div
                                            style={{
                                                padding: 16,
                                                border: '1px solid #e8e8e8',
                                                borderRadius: 8,
                                                maxHeight: 200,
                                                overflow: 'auto',
                                            }}
                                        >
                                            <div dangerouslySetInnerHTML={{ __html: highlightText(inputText) }} />
                                        </div>
                                    </Card>
                                )}

                                <Card>
                                    <Space
                                        direction="vertical"
                                        size="middle"
                                        style={{ width: '100%', textAlign: 'center' }}
                                    >
                                        <Text strong style={{ fontSize: 18 }}>
                                            Scanned {results.totalAllergens} allergens | Found {results.detectedAllergens}
                                        </Text>
                                        {results.matches.map((match, index) => (
                                            <Tag
                                                key={index}
                                                color={getSeverityColor(match.severity)}
                                                style={{ fontSize: 14 }}
                                            >
                                                {match.allergen} (Keyword: {match.keyword_found} | {match.severity} risk)
                                            </Tag>
                                        ))}
                                    </Space>
                                </Card>

                                <Space
                                    style={{ width: '100%', justifyContent: 'center', marginTop: 24 }}
                                    size={16}
                                >
                                    {/* <Button icon={<CopyOutlined />} onClick={copyResults}>
                                        Copy Report
                                    </Button>
                                    <Button icon={<DownloadOutlined />}>Download PDF</Button>
                                    <Button type="primary" icon={<ReloadOutlined />} onClick={resetForm}>
                                        New Scan
                                    </Button> */}
                                </Space>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                <style jsx global>{`
          .allergen-high {
            background: #ff4d4f !important;
            color: white !important;
            padding: 2px 6px !important;
            border-radius: 4px !important;
            animation: pulse 2s infinite;
            font-weight: bold;
          }
          .allergen-medium {
            background: #faad14 !important;
            color: #262626 !important;
            padding: 2px 6px !important;
            border-radius: 4px !important;
            font-weight: bold;
          }
          .allergen-low {
            background: #1890ff !important;
            color: white !important;
            padding: 2px 6px !important;
            border-radius: 4px !important;
            font-weight: bold;
          }
          @keyframes pulse {
            0%,
            100% {
              box-shadow: 0 0 0 0 rgba(255, 77, 79, 0.7);
            }
            70% {
              box-shadow: 0 0 0 10px rgba(255, 77, 79, 0);
            }
          }
        `}</style>
            </div>
        </ConfigProvider>
    );
};

export default MainPage;
