pipeline {
    agent any

    options {
        disableConcurrentBuilds()
        timeout(time: 10, unit: 'MINUTES')
    }

    environment {
        PROJECT_NAME       = "Smart-Expense-Splitter"
        TARGET_DIR         = "/var/jenkins_home/projects/${PROJECT_NAME}/${BRANCH_NAME}"
        SONAR_SCANNER_OPTS = "-Xmx512m"
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('SonarQube Analysis') {
            when {
                branch 'main'
            }

            steps {
                sh """
                    echo "Starting SonarQube analysis of $PROJECT_NAME"
                """

                script {
                    def scannerHome = tool 'sonar-scanner'

                    withSonarQubeEnv('SonarQube') {

                        sh """
                        ${scannerHome}/bin/sonar-scanner \
                          -Dsonar.projectKey=${PROJECT_NAME} \
                          -Dsonar.branch.name=${BRANCH_NAME}
                        """
                    }
                }
            }
        }

        stage('Deploy Frontend') {

            when {
                branch 'test'
            }

            steps {

                sh '''
                    echo "Deploying frontend to $TARGET_DIR"

                    mkdir -p "$TARGET_DIR"

                    rm -rf "$TARGET_DIR"/*

                    cp -r frontend/* "$TARGET_DIR"/
                '''
            }
        }
    }

    post {
        always {
            deleteDir()
        }
    }
}
