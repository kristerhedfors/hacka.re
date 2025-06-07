#!/usr/bin/env python3
"""
Setup script for openai_proxy package.
"""

from setuptools import setup, find_packages

with open('README.md', 'r', encoding='utf-8') as f:
    long_description = f.read()

setup(
    name='openai_proxy',
    version='0.1.0',
    description='Minimal OpenAI API-compatible proxies with libsodium authentication and content development tools',
    long_description=long_description,
    long_description_content_type='text/markdown',
    author='[AUTHOR_NAME]',
    author_email='[AUTHOR_EMAIL]',
    url='[REPOSITORY_URL]',
    packages=find_packages(),
    package_data={
        'openai_proxy': ['src/content/default_functions/*', 'src/content/default_prompts/*'],
    },
    include_package_data=True,
    install_requires=[
        'starlette>=0.27.0',
        'uvicorn>=0.20.0',
        'flask>=2.3.0',
        'httpx>=0.24.0',
        'pynacl>=1.5.0',
        'requests>=2.28.0',
        'openai>=1.0.0',
        'gunicorn>=20.1.0',
        'werkzeug>=2.3.0',
    ],
    extras_require={
        'dev': ['pytest>=7.0.0', 'pytest-asyncio>=0.21.0'],
        'benchmarks': ['locust>=2.0.0', 'matplotlib>=3.4.0'],
    },
    entry_points={
        'console_scripts': [
            'openai-proxy=openai_proxy.src:main',
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
    ],
    python_requires='>=3.8',
)
