'use client';

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Message } from '@/app/interfaces/Message';
import { languages } from '@/app/components/Lang';
import io from 'socket.io-client';

export default function Home() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isListening, setIsListening] = useState<boolean>(false);
    const [recognition, setRecognition] = useState<any>(null);
    const [fromLang, setFromLang] = useState<string>('ja-JP');
    const [toLang, setToLang] = useState<string>('en-US');

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const socket = io();

    useEffect(() => {
        const handleSocketEvents = async (message: string) => {
            const requestData = {
                userMessage: message,
                fromLangCode: fromLang,
                toLangCode: toLang,
            }

            try {
                const res = await axios.post('/api/translate', requestData);
                console.log(res.data.translate)

                const translateMessage:Message = { role: 'user', content: res.data.translate };
                setMessages(prevMessages => [...prevMessages, translateMessage]);

                handleSpeak(translateMessage.content);
            } catch (error) {
                console.error('Translation error:', error);
            }
        };

        socket.on('connect', () => {
            console.log('connected to server');
        });

        socket.on('message', (data: any) => {
            console.log(data)
            handleSocketEvents(data.message)
        });

        return () => {
            socket.off('connect');
            socket.off('message');
        };
    }, []);

    useEffect(() => {
        translate();
    }, [fromLang, toLang]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const swapLanguages = () => {
        const temp = fromLang;
        setFromLang(toLang);
        setToLang(temp);
    };

    const handleVoiceInput = () => {
        if (recognition) {
            recognition.start();
        }
    };

    const handleFromLang = (event: any) => {
        console.log(event.target.value)
        setFromLang(event.target.value);
    };

    const handleToLang = (event: any) => {
        console.log(event.target.value)
        setToLang(event.target.value);
    };

    const handleSpeak = (text: string) => {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            window.speechSynthesis.speak(utterance);
        } else {
            alert('Your browser does not support speech synthesis.');
        }
    };

    const translate = () => {
        if ('webkitSpeechRecognition' in window) {
            const speechRecognition = new (window as any).webkitSpeechRecognition();
            speechRecognition.continuous = false;
            speechRecognition.interimResults = false;
            speechRecognition.lang = fromLang;

            speechRecognition.onstart = () => {
                setIsListening(true);
            };

            speechRecognition.onend = () => {
                setIsListening(false);
            };

            speechRecognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                handleSubmit(transcript);
            };
            setRecognition(speechRecognition);
        } else {
            alert('Web Speech API is not supported in this browser.');
        }
    }

    const handleSubmit = async (userMessage: string) => {
        if (!userMessage) return;
        setMessages(prevMessages => [...prevMessages, { role: 'user', content: userMessage }]);
        socket.emit('message', userMessage);
    };

    return (
        <div className="p-4 mb-4">
            <div className="bg-white shadow-md p-4 z-10">
                <h1>会話アプリ</h1>
                <div>
                    <select id="from-language" className="mx-3 p-3" value={fromLang} onChange={handleFromLang}>
                        {languages.map((language) => (
                            <option key={language.code} value={language.code}>
                                {language.name}
                            </option>
                        ))}
                    </select>
                    <button onClick={swapLanguages} className="mx-3 p-3">
                        →
                    </button>
                    <select id="to-language" className="mx-3 p-3" value={toLang} onChange={handleToLang}>
                        {languages.map((language) => (
                            <option key={language.code} value={language.code}>
                                {language.name}
                            </option>
                        ))}
                    </select>
                </div>

                <button onClick={handleVoiceInput} className="p-2 bg-blue-500 text-white rounded mt-4">
                    {isListening ? 'Listening...' : '音声入力'}
                </button>
            </div>

            <div>
                {messages && messages.map((message, index) => (
                    <div
                        key={index}
                        className={`m-3 p-5 rounded-lg shadow-md
                        ${message.role === 'user' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100  text-gray-800'}
                    `}>
                        <span className=
                            {`inline-block mb-2 me-3 px-3 py-1 
                                rounded-full text-white 
                                text-sm font-semibold
                            ${message.role === 'user' ? 'bg-blue-600' : 'bg-gray-600'}
                        `}>
                            {message.role === 'partner' ? 'あなた' : 'ボット'}
                        </span>
                        <span>{message.content}</span>
                    </div>
                ))}
            </div>
            <div ref={messagesEndRef} />
        </div>
    );
}