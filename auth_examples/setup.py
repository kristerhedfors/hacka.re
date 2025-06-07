#!/usr/bin/env python3
"""
Setup script for auth_examples package.
Authentication examples extracted from openai_proxy project.
"""

from setuptools import setup, find_packages

with open('README.md', 'r', encoding='utf-8') as f:
    long_description = f.read()

setup(
    name='auth_examples',
    version='0.1.0',
    description='API authentication examples with cryptographic signatures using PyNaCl',
    long_description=long_description,
    long_description_content_type='text/markdown',
    author='hacka.re project',
    url='https://github.com/kristerhedfors/hacka.re',
    packages=find_packages(),
    package_data={
        'auth_examples': ['examples/*', 'tests/*'],
    },
    include_package_data=True,
    install_requires=[
        'pynacl>=1.5.0',
        'starlette>=0.27.0',
        'uvicorn>=0.20.0',
        'httpx>=0.24.0',
        'python-dotenv>=1.0.0',
        'requests>=2.28.0',
    ],
    extras_require={
        'dev': ['pytest>=7.0.0', 'pytest-asyncio>=0.21.0'],
        'examples': ['flask>=2.3.0', 'gunicorn>=20.1.0'],
    },
    entry_points={
        'console_scripts': [
            'auth-keygen=auth_examples.src.keygen:main',
            'auth-server=auth_examples.src.examples.hmac_server:main',
        ],
    },
    classifiers=[
        'Development Status :: 3 - Alpha',
        'Intended Audience :: Developers',
        'License :: OSI Approved :: MIT License',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.8',
        'Programming Language :: Python :: 3.9',
        'Programming Language :: Python :: 3.10',
        'Programming Language :: Python :: 3.11',
        'Topic :: Security :: Cryptography',
        'Topic :: Internet :: WWW/HTTP :: HTTP Servers',
    ],
    python_requires='>=3.8',
)