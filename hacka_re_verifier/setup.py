#!/usr/bin/env python3
"""
Setup script for hacka_re_verifier package.
"""

from setuptools import setup, find_packages

with open('README.md', 'r', encoding='utf-8') as f:
    long_description = f.read()

setup(
    name='hacka_re_verifier',
    version='0.1.0',
    description='A verification tool for hacka.re privacy and security claims',
    long_description=long_description,
    long_description_content_type='text/markdown',
    author='hacka.re Team',
    author_email='info@hacka.re',
    url='https://github.com/hacka-re/verifier',
    packages=find_packages(),
    package_data={
        'hacka_re_verifier': ['src/report_generation/templates/*'],
    },
    include_package_data=True,
    install_requires=[
        'jsbeautifier>=1.14.0',
        'esprima>=4.0.1',
        'beautifulsoup4>=4.10.0',
        'playwright>=1.20.0',
        'jinja2>=3.0.0',
        'markdown>=3.3.0',
        'pandas>=1.3.0',
        'tabulate>=0.8.9',
        'matplotlib>=3.4.0',
        'pyyaml>=6.0',
    ],
    extras_require={
        'pdf': ['weasyprint>=54.0'],
    },
    entry_points={
        'console_scripts': [
            'hacka-re-verifier=hacka_re_verifier.src.main:main',
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
